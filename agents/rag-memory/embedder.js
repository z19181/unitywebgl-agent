// ========================================
// v1.2.0 Phase B — Embedder Module (Multi-Provider)
// Priority: OpenAI (if quota OK) → Ollama (local) → Mock
// ========================================
import 'dotenv/config';

const PROVIDER_STRATEGY = process.env.EMBEDDING_PROVIDER || 'auto'; // 'auto' | 'openai' | 'ollama' | 'mock'

let provider = null;
let providerName = null;

async function getProvider() {
  if (provider) return { provider, name: providerName };

  // Strategy: auto → try OpenAI first, fall back to Ollama
  if (PROVIDER_STRATEGY === 'openai' || PROVIDER_STRATEGY === 'auto') {
    try {
      const { default: OpenAI } = await import('openai');
      const { HttpsProxyAgent } = await import('https-proxy-agent');
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        const opts = { apiKey };
        const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
        if (proxyUrl) {
          opts.httpAgent = new HttpsProxyAgent(proxyUrl);
        }
        const client = new OpenAI(opts);
        // Quick validation: try a tiny request
        await client.embeddings.create({ model: 'text-embedding-3-small', input: 'test', dimensions: 1536 });
        provider = client;
        providerName = 'openai';
        console.log('[Embedder] Provider: OpenAI');
        return { provider, name: providerName };
      }
    } catch (err) {
      if (err.message?.includes('quota') || err.status === 429) {
        console.warn('[Embedder] OpenAI quota exceeded, falling back to Ollama');
      } else if (err.message?.includes('Invalid API key')) {
        console.warn('[Embedder] OpenAI key invalid, falling back to Ollama');
      } else {
        console.warn(`[Embedder] OpenAI unavailable: ${err.message}, falling back to Ollama`);
      }
    }
  }

  // Ollama fallback
  if (PROVIDER_STRATEGY === 'ollama' || PROVIDER_STRATEGY === 'auto' || !provider) {
    const ollamaModule = await import('./providers/ollama_provider.js');
    const info = ollamaModule.getProviderInfo();
    provider = { embedText: ollamaModule.embedText, getProviderInfo: ollamaModule.getProviderInfo };
    providerName = 'ollama';
    console.log(`[Embedder] Provider: Ollama (${info.model}, ${info.dimensions} dims)`);
    return { provider, name: providerName };
  }

  // Mock provider (last resort)
  provider = createMockProvider();
  providerName = 'mock';
  console.log('[Embedder] Provider: Mock (development only)');
  return { provider, name: providerName };
}

function createMockProvider() {
  return {
    embedText: async (text) => {
      // Deterministic fake embedding based on text hash
      const hash = text.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
      const dim = 768;
      return Array.from({ length: dim }, (_, i) => {
        const seed = Math.abs(hash ^ (i * 2654435761 >>> 0)) / 0xFFFFFFFF;
        return (seed * 2) - 1;
      });
    },
    getProviderInfo: () => ({ provider: 'mock', model: 'mock', dimensions: 768, isLocal: true }),
  };
}

/**
 * Generate embedding for a single text
 */
async function embedText(text, { retries = 3 } = {}) {
  const { provider, name } = await getProvider();
  
  if (name === 'openai') {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await provider.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 1536,
        });
        return response.data[0].embedding;
      } catch (err) {
        if (err.status === 429 && attempt < retries) {
          const delay = 200 * attempt * attempt;
          console.warn(`[Embedder] Rate limited, retrying in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else if (err.message?.includes('quota') || err.status === 429) {
          throw new Error('OpenAI quota exceeded');
        } else if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          throw err;
        }
      }
    }
  }
  
  if (name === 'ollama' || name === 'mock') {
    const result = await provider.embedText(text);
    // Ollama embedText always returns array even for single text: [[...]]
    return result[0];
  }
}

/**
 * Batch embed multiple texts (respects rate limits)
 */
async function embedBatch(texts, { onProgress, batchSize = 20 } = {}) {
  const { name, provider: prov } = await getProvider();
  
  // Ollama: call embedBatch directly (accepts string[], returns number[][])
  if (name === 'ollama') {
    const allEmbeddings = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      // Ollama embedText with array input returns number[][] directly
      const results = await prov.embedText(batch);
      allEmbeddings.push(...results);
      if (onProgress) {
        onProgress({ completed: Math.min(i + batchSize, texts.length), total: texts.length });
      }
      if (i + batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return allEmbeddings;
  }
  
  // OpenAI: use embeddings.create API directly
  if (name === 'openai') {
    const allEmbeddings = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const response = await prov.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
        dimensions: 1536,
      });
      allEmbeddings.push(...response.data.map(d => d.embedding));
      if (onProgress) {
        onProgress({ completed: Math.min(i + batchSize, texts.length), total: texts.length });
      }
      if (i + batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    return allEmbeddings;
  }
  
  // Mock: same as single-text wrapper
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    const result = await prov.embedText(texts[i]);
    embeddings.push(Array.isArray(result[0]) ? result[0] : result);
    if (onProgress) {
      onProgress({ completed: i + 1, total: texts.length });
    }
  }
  return embeddings;
}

export function getProviderInfo() {
  // Returns info about the ACTIVE provider (set during getProvider())
  if (providerName === 'openai') {
    return { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536, isLocal: false };
  } else if (providerName === 'ollama') {
    return { provider: 'ollama', model: 'nomic-embed-text', dimensions: 768, isLocal: true };
  } else if (providerName === 'mock') {
    return { provider: 'mock', model: 'mock', dimensions: 768, isLocal: true };
  }
  // Fallback: detect from environment
  return { provider: 'ollama', model: 'nomic-embed-text', dimensions: 768, isLocal: true };
}

export { embedText, embedBatch };
export default { embedText, embedBatch, getProviderInfo };
