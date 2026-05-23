// server/store/index.js — v0.3.1 Store Factory
//
// STORE_TYPE=memory (default) → MemoryStore
// STORE_TYPE=redis  REDIS_URL=redis://... → RedisStore

const MemoryStore = require('./MemoryStore');
const RedisStore = require('./RedisStore');

async function createStore() {
  const storeType = (process.env.STORE_TYPE || 'memory').toLowerCase();

  if (storeType === 'memory') {
    console.log('[store] Using MemoryStore');
    return new MemoryStore();
  }

  if (storeType === 'redis') {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    // Lazy-load ioredis so memory-only deploys don't require it
    const Redis = require('ioredis');
    const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
    await redis.connect();
    console.log(`[store] Using RedisStore → ${url}`);
    return new RedisStore(redis, { reconnectTTL: 10 });
  }

  throw new Error(`Unknown STORE_TYPE: ${storeType}. Use 'memory' or 'redis'.`);
}

module.exports = { createStore, MemoryStore, RedisStore };
