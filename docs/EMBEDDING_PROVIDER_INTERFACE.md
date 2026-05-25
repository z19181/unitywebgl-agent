# Embedding Provider Interface

**Version:** 1.0.0
**Status:** Draft
**Related:** `V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md`

---

## 1. Interface Definition (TypeScript)

```typescript
/**
 * EmbeddingProvider Interface
 *
 * Abstraction for embedding generation (OpenAI, Ollama, Cohere, Hybrid).
 * All embedding providers MUST implement this interface.
 */
export interface EmbeddingProvider {
  /**
   * Provider name (for logging/debugging)
   * @returns {string} Provider name (e.g., "openai", "ollama", "cohere", "hybrid")
   */
  name(): string;

  /**
   * Vector dimensions (for pgvector storage)
   * @returns {number} Vector dimensions (e.g., 1536, 768, 1024)
   */
  dimensions(): number;

  /**
   * Generate embedding for a single text
   * @param {string} text - Input text
   * @returns {Promise<number[]>} Embedding vector
   * @throws {EmbeddingError} If embedding generation fails
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for a batch of texts
   * @param {string[]} texts - Array of input texts
   * @returns {Promise<number[][]>} Array of embedding vectors
   * @throws {EmbeddingError} If embedding generation fails
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Health check (for hybrid routing)
   * @returns {Promise<boolean>} True if provider is healthy
   */
  healthCheck(): Promise<boolean>;
}
```

---

## 2. Error Handling

```typescript
/**
 * EmbeddingError — Custom error class for embedding failures
 */
export class EmbeddingError extends Error {
  constructor(
    public provider: string,
    public code: string,
    message: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Error codes:
 * - RATE_LIMIT: API rate limit exceeded
 * - AUTHENTICATION: Invalid API key
 * - NETWORK: Network error (offline)
 * - INVALID_RESPONSE: Invalid response from provider
 * - DIMENSION_MISMATCH: Vector dimensions mismatch
 */
```

---

## 3. Implementation Examples

### 3.1 OpenAI Embedding Provider

```typescript
import { OpenAI } from 'openai';
import { EmbeddingProvider, EmbeddingError } from './embedding-provider.interface';

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model = 'text-embedding-3-small', dimensions = 1536) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

  name(): string {
    return `openai-${this.model}`;
  }

  dimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `OpenAI embedding failed: ${error.message}`,
        error
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      return response.data.map((item: any) => item.embedding);
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `OpenAI batch embedding failed: ${error.message}`,
        error
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.embed('health check');
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### 3.2 Ollama Embedding Provider

```typescript
import axios, { AxiosInstance } from 'axios';
import { EmbeddingProvider, EmbeddingError } from './embedding-provider.interface';

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private client: AxiosInstance;
  private model: string;
  private dimensions: number;

  constructor(baseURL = 'http://localhost:11434', model = 'nomic-embed-text', dimensions = 768) {
    this.client = axios.create({ baseURL });
    this.model = model;
    this.dimensions = dimensions;
  }

  name(): string {
    return `ollama-${this.model}`;
  }

  dimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.post('/api/embeddings', {
        model: this.model,
        prompt: text,
      });

      return response.data.embedding;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Ollama embedding failed: ${error.message}`,
        error
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await Promise.all(
        texts.map((text) => this.embed(text))
      );
      return embeddings;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Ollama batch embedding failed: ${error.message}`,
        error
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/');
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### 3.3 Cohere Embedding Provider

```typescript
import { CohereClient } from 'cohere-ai';
import { EmbeddingProvider, EmbeddingError } from './embedding-provider.interface';

export class CohereEmbeddingProvider implements EmbeddingProvider {
  private client: CohereClient;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, model = 'embed-english-v3', dimensions = 1024) {
    this.client = new CohereClient({ token: apiKey });
    this.model = model;
    this.dimensions = dimensions;
  }

  name(): string {
    return `cohere-${this.model}`;
  }

  dimensions(): number {
    return this.dimensions;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embed({
        texts: [text],
        model: this.model,
      });

      return response.embeddings[0];
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Cohere embedding failed: ${error.message}`,
        error
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const response = await this.client.embed({
        texts,
        model: this.model,
      });

      return response.embeddings;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Cohere batch embedding failed: ${error.message}`,
        error
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.embed('health check');
      return true;
    } catch {
      return false;
    }
  }
}
```

---

### 3.4 Hybrid Embedding Provider (Local First, Cloud Fallback)

```typescript
import { EmbeddingProvider, EmbeddingError } from './embedding-provider.interface';

export class HybridEmbeddingProvider implements EmbeddingProvider {
  private localProvider: EmbeddingProvider;
  private cloudProvider: EmbeddingProvider;
  private cache: Map<string, number[]>;

  constructor(localProvider: EmbeddingProvider, cloudProvider: EmbeddingProvider) {
    this.localProvider = localProvider;
    this.cloudProvider = cloudProvider;
    this.cache = new Map();
  }

  name(): string {
    return `hybrid-${this.localProvider.name()}-${this.cloudProvider.name()}`;
  }

  dimensions(): number {
    // Use cloud provider dimensions (higher quality)
    return this.cloudProvider.dimensions();
  }

  async embed(text: string): Promise<number[]> {
    // 1. Check cache
    const cacheKey = `${this.name()}-${text}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 2. Try local provider first
    try {
      if (await this.localProvider.healthCheck()) {
        const embedding = await this.localProvider.embed(text);
        this.cache.set(cacheKey, embedding);
        return embedding;
      }
    } catch (error) {
      console.warn(`Local provider failed, falling back to cloud: ${error.message}`);
    }

    // 3. Fallback to cloud provider
    try {
      const embedding = await this.cloudProvider.embed(text);
      this.cache.set(cacheKey, embedding);
      return embedding;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Both local and cloud providers failed: ${error.message}`,
        error
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // 1. Check cache
    const cacheKeys = texts.map((text) => `${this.name()}-${text}`);
    const cachedEmbeddings: number[][] = [];
    const textsToEmbed: string[] = [];
    const indices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
      if (this.cache.has(cacheKeys[i])) {
        cachedEmbeddings[i] = this.cache.get(cacheKeys[i])!;
      } else {
        textsToEmbed.push(texts[i]);
        indices.push(i);
      }
    }

    // 2. Try local provider first
    let embeddings: number[][];
    try {
      if (await this.localProvider.healthCheck()) {
        embeddings = await this.localProvider.embedBatch(textsToEmbed);
      }
    } catch (error) {
      console.warn(`Local provider failed, falling back to cloud: ${error.message}`);
    }

    // 3. Fallback to cloud provider
    if (!embeddings) {
      try {
        embeddings = await this.cloudProvider.embedBatch(textsToEmbed);
      } catch (error) {
        throw new EmbeddingError(
          this.name(),
          'NETWORK',
          `Both local and cloud providers failed: ${error.message}`,
          error
        );
      }
    }

    // 4. Merge cached + new embeddings
    const result: number[][] = new Array(texts.length);
    for (let i = 0; i < texts.length; i++) {
      if (cachedEmbeddings[i]) {
        result[i] = cachedEmbeddings[i];
      }
    }

    for (let i = 0; i < embeddings.length; i++) {
      result[indices[i]] = embeddings[i];
      this.cache.set(cacheKeys[indices[i]], embeddings[i]);
    }

    return result;
  }

  async healthCheck(): Promise<boolean> {
    const localHealthy = await this.localProvider.healthCheck();
    const cloudHealthy = await this.cloudProvider.healthCheck();
    return localHealthy || cloudHealthy;
  }
}
```

---

## 4. Usage Examples

### 4.1 Single Provider (OpenAI)

```typescript
import { OpenAIEmbeddingProvider } from './providers/openai-provider';
import { EmbeddingProvider } from './embedding-provider.interface';

async function main() {
  const provider: EmbeddingProvider = new OpenAIEmbeddingProvider(
    process.env.OPENAI_API_KEY!,
    'text-embedding-3-small',
    1536
  );

  // Single embedding
  const embedding = await provider.embed('Hello, world!');
  console.log(`Embedding dimensions: ${embedding.length}`); // 1536

  // Batch embedding
  const embeddings = await provider.embedBatch(['Hello', 'World']);
  console.log(`Batch size: ${embeddings.length}`); // 2
}

main();
```

---

### 4.2 Hybrid Provider (Local First, Cloud Fallback)

```typescript
import { OpenAIEmbeddingProvider } from './providers/openai-provider';
import { OllamaEmbeddingProvider } from './providers/ollama-provider';
import { HybridEmbeddingProvider } from './providers/hybrid-provider';
import { EmbeddingProvider } from './embedding-provider.interface';

async function main() {
  const localProvider: EmbeddingProvider = new OllamaEmbeddingProvider(
    'http://localhost:11434',
    'nomic-embed-text',
    768
  );

  const cloudProvider: EmbeddingProvider = new OpenAIEmbeddingProvider(
    process.env.OPENAI_API_KEY!,
    'text-embedding-3-small',
    1536
  );

  const provider: EmbeddingProvider = new HybridEmbeddingProvider(
    localProvider,
    cloudProvider
  );

  // Will try Ollama first, fallback to OpenAI if Ollama fails
  const embedding = await provider.embed('Hello, world!');
  console.log(`Embedding dimensions: ${embedding.length}`);
}

main();
```

---

## 5. Caching Strategy

### 5.1 In-Memory Cache (Simple)

```typescript
class InMemoryEmbeddingCache {
  private cache: Map<string, number[]>;
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(text: string, providerName: string): number[] | undefined {
    const key = `${providerName}-${text}`;
    return this.cache.get(key);
  }

  set(text: string, providerName: string, embedding: number[]): void {
    const key = `${providerName}-${text}`;

    // Evict oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, embedding);
  }
}
```

---

### 5.2 Redis Cache (Distributed)

```typescript
import Redis from 'ioredis';

class RedisEmbeddingCache {
  private redis: Redis;
  private ttlSeconds: number;

  constructor(redisURL: string, ttlSeconds = 86400) {
    this.redis = new Redis(redisURL);
    this.ttlSeconds = ttlSeconds;
  }

  async get(text: string, providerName: string): Promise<number[] | null> {
    const key = `embedding:${providerName}:${this.hashText(text)}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(text: string, providerName: string, embedding: number[]): Promise<void> {
    const key = `embedding:${providerName}:${this.hashText(text)}`;
    await this.redis.setex(key, this.ttlSeconds, JSON.stringify(embedding));
  }

  private hashText(text: string): string {
    // Simple hash (use crypto.createHash for production)
    return Buffer.from(text).toString('base64');
  }
}
```

---

## 6. Fallback Logic (Hybrid Provider)

```typescript
class HybridEmbeddingProvider implements EmbeddingProvider {
  // ... (see Section 3.4)

  async embed(text: string): Promise<number[]> {
    // 1. Check cache
    const cached = await this.cache.get(text, this.name());
    if (cached) {
      return cached;
    }

    // 2. Try local provider first
    try {
      if (await this.localProvider.healthCheck()) {
        const embedding = await this.localProvider.embed(text);
        await this.cache.set(text, this.name(), embedding);
        return embedding;
      }
    } catch (error) {
      console.warn(`Local provider failed, falling back to cloud: ${error.message}`);
    }

    // 3. Fallback to cloud provider
    try {
      const embedding = await this.cloudProvider.embed(text);
      await this.cache.set(text, this.name(), embedding);
      return embedding;
    } catch (error) {
      throw new EmbeddingError(
        this.name(),
        'NETWORK',
        `Both local and cloud providers failed: ${error.message}`,
        error
      );
    }
  }
}
```

---

## 7. Testing

### 7.1 Unit Tests (Mock Provider)

```typescript
import { EmbeddingProvider } from './embedding-provider.interface';

class MockEmbeddingProvider implements EmbeddingProvider {
  name(): string {
    return 'mock';
  }

  dimensions(): number {
    return 384;
  }

  async embed(text: string): Promise<number[]> {
    // Return fixed embedding for testing
    return new Array(384).fill(0.1);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(384).fill(0.1));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// Test
import { describe, it, expect } from 'vitest';

describe('MockEmbeddingProvider', () => {
  it('should generate embedding', async () => {
    const provider = new MockEmbeddingProvider();
    const embedding = await provider.embed('test');
    expect(embedding.length).toBe(384);
  });
});
```

---

### 7.2 Integration Tests (OpenAI)

```typescript
import { OpenAIEmbeddingProvider } from './providers/openai-provider';
import { describe, it, expect } from 'vitest';

describe('OpenAIEmbeddingProvider', () => {
  it('should generate embedding', async () => {
    const provider = new OpenAIEmbeddingProvider(
      process.env.OPENAI_API_KEY!,
      'text-embedding-3-small',
      1536
    );

    const embedding = await provider.embed('test');
    expect(embedding.length).toBe(1536);
  });
});
```

---

## 8. Performance Benchmarks

| Provider | Latency (single) | Latency (batch-100) | Throughput (embeddings/sec) |
|----------|-------------------|----------------------|----------------------------|
| OpenAI (text-embedding-3-small) | ~50ms | ~200ms | ~500 |
| Ollama (nomic-embed-text, CPU) | ~200ms | ~2000ms | ~50 |
| Ollama (nomic-embed-text, GPU) | ~50ms | ~500ms | ~200 |
| Cohere (embed-english-v3) | ~80ms | ~300ms | ~333 |
| Hybrid (Ollama → OpenAI) | ~200ms (fallback: ~50ms) | ~2000ms (fallback: ~200ms) | ~50 (fallback: ~500) |

---

## 9. Decision Record

**Decision:** Use `EmbeddingProvider` interface (abstraction for multiple providers).

**Rationale:**
1. ✅ **Extensible** (add new providers without changing code)
2. ✅ **Testable** (mock provider for unit tests)
3. ✅ **Flexible** (switch providers via configuration)
4. ✅ **Hybrid-ready** (combine multiple providers)

**Next Action:** Implement `EmbeddingProvider` interface in Phase B.1 (`embedder.js`).

---

**End of Embedding Provider Interface**
