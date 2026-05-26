// ========================================
// v1.2.0 Phase B.1-local — Ollama Provider
// ========================================

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 60000; // Ollama can be slow on M2

/**
 * Generate embeddings via Ollama /api/embeddings
 * @param {string|string[]} texts - Single text or array of texts
 * @returns {Promise<number[][]>} Array of embedding vectors
 */
export async function embedText(texts) {
  const textArray = Array.isArray(texts) ? texts : [texts];
  const results = [];

  for (const text of textArray) {
    const embedding = await embedWithRetry(text);
    results.push(embedding);
  }

  return results;
}

async function embedWithRetry(text, attempt = 0) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: text,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text().catch(() => '');
      throw new Error(`Ollama API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error(`Invalid embedding response from Ollama`);
    }

    return data.embedding;
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
    console.warn(`[Ollama] Error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${err.message}. Retrying in ${delay}ms...`);
    await sleep(delay);
    return embedWithRetry(text, attempt + 1);
  }
}

export function getProviderInfo() {
  return {
    provider: 'ollama',
    model: OLLAMA_MODEL,
    baseUrl: OLLAMA_BASE_URL,
    dimensions: 768, // nomic-embed-text is 768-dim
    isLocal: true,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// For batch support: embed a batch with rate limiting
export async function embedBatch(texts, batchSize = 16) {
  const results = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await embedText(batch);
    results.push(...batchResults);
    if (i + batchSize < texts.length) {
      await sleep(200); // Rate limit to avoid Ollama overload
    }
  }
  return results;
}
