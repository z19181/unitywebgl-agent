// ========================================
// v1.2.0 Phase B.4 — Retrieval Cache
// retrieval_cache.js
// In-memory cache for query → top_k results
// ========================================

import crypto from 'crypto';

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_SIZE = 500; // max cached queries

class RetrievalCache {
  constructor({ ttlMs = DEFAULT_TTL_MS, maxSize = MAX_CACHE_SIZE } = {}) {
    this.cache = new Map(); // key → { result, expiresAt, hits }
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0,
    };
  }

  /**
   * Normalize query for consistent cache key.
   * Lowercases, collapses whitespace, strips punctuation.
   */
  normalizeQuery(query) {
    if (!query) return '';
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate cache key from query + options.
   */
  makeKey(query, { topK = 5, mode = 'hybrid' } = {}) {
    const norm = this.normalizeQuery(query);
    const raw = `${mode}:${topK}:${norm}`;
    // Use hash for long queries
    if (raw.length > 200) {
      return 'hk:' + crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
    }
    return raw;
  }

  /**
   * Get cached result.
   * Returns null if not found or expired.
   */
  get(query, { topK = 5, mode = 'hybrid' } = {}) {
    const key = this.makeKey(query, { topK, mode });
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return this._deepClone(entry.result);
  }

  /**
   * Store result in cache.
   */
  set(query, result, { topK = 5, mode = 'hybrid', ttlMs = this.ttlMs } = {}) {
    const key = this.makeKey(query, { topK, mode });

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }

    this.cache.set(key, {
      result: this._deepClone(result),
      expiresAt: Date.now() + ttlMs,
      hits: 0,
      createdAt: Date.now(),
    });
    this.stats.sets++;
  }

  /**
   * Invalidate cache entries matching a predicate.
   * Used after re-indexing or embedder changes.
   */
  invalidate(predicate) {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (!predicate || predicate(entry, key)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    return count;
  }

  /**
   * Invalidate all entries (call after re-indexing).
   */
  invalidateAll() {
    return this.invalidate();
  }

  /**
   * Invalidate entries containing a specific file path.
   */
  invalidateByPath(filePath) {
    const lower = (filePath || '').toLowerCase();
    return this.invalidate((entry) =>
      entry.result?.results?.some(r => r.path?.toLowerCase().includes(lower))
    );
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      avgHitsPerEntry: this.cache.size > 0
        ? Array.from(this.cache.values()).reduce((s, e) => s + e.hits, 0) / this.cache.size
        : 0,
    };
  }

  /**
   * Clear all entries.
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, invalidations: 0 };
  }

  _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
}

// Singleton instance
const _cache = new RetrievalCache();

/**
 * Cached hybridSearch wrapper.
 * Wraps hybridSearch() with cache.
 * @param {function} searchFn - The hybridSearch function
 * @returns {function} cached search function
 */
export function withCache(searchFn) {
  return async function cachedHybridSearch(query, options = {}) {
    const useCache = options.useCache !== false;
    const topK = options.topK || 5;
    const mode = options.mode || 'hybrid';

    if (useCache) {
      const cached = _cache.get(query, { topK, mode });
      if (cached) {
        return { ...cached, _fromCache: true };
      }
    }

    const result = await searchFn(query, { ...options, useCache: false });
    if (useCache && result.results) {
      _cache.set(query, result, { topK, mode });
    }

    return { ...result, _fromCache: false };
  };
}

/**
 * CLI: inspect cache
 * Usage: node retrieval_cache.js [stats|clear|get "query"]
 */
if (process.argv[1]?.includes('retrieval_cache')) {
  const subcmd = process.argv[2] || 'stats';

  if (subcmd === 'stats') {
    const stats = _cache.getStats();
    console.log('\n[Cache Stats]');
    console.log('  Size:', stats.size);
    console.log('  Hits:', stats.hits);
    console.log('  Misses:', stats.misses);
    console.log('  Hit rate:', (stats.hitRate * 100).toFixed(1) + '%');
    console.log('  Sets:', stats.sets);
    console.log('  Evictions:', stats.evictions);
    console.log('  Invalidations:', stats.invalidations);
    console.log('');
  } else if (subcmd === 'clear') {
    _cache.clear();
    console.log('[Cache] Cleared');
  } else if (subcmd === 'get') {
    const query = process.argv.slice(3).join(' ');
    const result = _cache.get(query);
    if (result) {
      console.log('[Cache] HIT for:', query);
      console.log(JSON.stringify(result, null, 2).slice(0, 2000));
    } else {
      console.log('[Cache] MISS for:', query);
    }
  }
}

export default RetrievalCache;
export { _cache as cache, RetrievalCache };

export function clear() {
  _cache.cache?.clear();
}
