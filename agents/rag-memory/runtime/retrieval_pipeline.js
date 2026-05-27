// ========================================
// v1.2.0 Phase C — Retrieval Pipeline
// Core pipeline for runtime retrieval
// ========================================

import { hybridSearch } from '../hybrid_retrieval.js';
import { enforceGovernanceResults, hasGovernanceIntent } from '../governance_enforcer.js';
import { cache, clear as clearCache } from '../retrieval_cache.js';
import { explainRetrieval } from '../explain_retrieval.js';
import { embedText } from '../embedder.js';

/**
 * Core retrieval pipeline
 * - Check cache
 * - Run retrieval (keyword/semantic/hybrid)
 * - Enforce governance if needed
 * - Return structured results
 */
async function retrievalPipeline(query, options = {}) {
  const startTime = Date.now();
  const metrics = {
    latency_ms: 0,
    cache_hit: false,
    cache_latency_ms: 0,
    semantic_latency_ms: 0,
    keyword_latency_ms: 0,
    governance_latency_ms: 0,
    num_candidates: 0,
    num_blocked: 0,
    embedding_provider: 'unknown',
    embedding_dims: 0,
  };

  // 1. Check cache
  const cacheStart = Date.now();
  const cached = cache.get(query, { topK: options.topK, mode: options.mode });
  metrics.cache_latency_ms = Date.now() - cacheStart;

  if (cached) {
    metrics.cache_hit = true;
    metrics.latency_ms = Date.now() - startTime;
    return {
      ...cached,
      metrics: { ...cached.metrics, ...metrics },
    };
  }

  // 2. Determine retrieval mode
  const mode = options.mode || 'hybrid';
  let results = [];
  let keywordResults = [];
  let semanticResults = [];

  // 3. Execute retrieval based on mode
  if (mode === 'keyword' || mode === 'hybrid') {
    const kwStart = Date.now();
    // Use keyword search from hybrid_retrieval.js
    const kwResponse = await hybridSearch(query, { topK: options.topK || 20, keywordOnly: true });
    keywordResults = kwResponse.results || [];
    metrics.keyword_latency_ms = Date.now() - kwStart;
  }

  if (mode === 'semantic' || mode === 'hybrid') {
    const semStart = Date.now();
    try {
      const semResponse = await hybridSearch(query, { topK: options.topK || 20, semanticOnly: true });
      semanticResults = semResponse.results || [];
      metrics.semantic_latency_ms = Date.now() - semStart;
    } catch (err) {
      console.warn('[RetrievalPipeline] Semantic search failed:', err.message);
      metrics.semantic_latency_ms = Date.now() - semStart;
    }
  }

  // 4. Merge results (for hybrid mode)
  if (mode === 'hybrid') {
    const mergeStart = Date.now();
    const merged = mergeResults(keywordResults, semanticResults, options.topK || 5);
    results = merged;
    metrics.num_candidates = results.length;
  } else if (mode === 'keyword') {
    results = keywordResults.slice(0, options.topK || 5);
  } else if (mode === 'semantic') {
    results = semanticResults.slice(0, options.topK || 5);
  }

  // 5. Governance enforcement
  const govStart = Date.now();
  const shouldEnforce = options.requireGovernance || hasGovernanceIntent(query);
  
  if (shouldEnforce) {
    results = enforceGovernanceResults(query, results, { topK: options.topK || 5 });
  }
  metrics.governance_latency_ms = Date.now() - govStart;

  // 6. Count blocked results
  metrics.num_blocked = results.filter(r => r.blocked).length;

  // 7. Build response
  const response = {
    query,
    mode,
    retrieval_hash: computeRetrievalHash(query, options),
    top_k: results.length,
    chunks: results.map(r => formatChunk(r, options)),
    governance_enforced: shouldEnforce,
    violations: metrics.num_blocked,
    metrics: { ...metrics, latency_ms: Date.now() - startTime },
  };

  // 8. Add explanation if requested
  if (options.explain) {
    response.explanation = results.map(r => explainRetrieval(r, query));
  }

  // 9. Cache the result
  cache.set(query, response, { topK: options.topK, mode: options.mode });

  return response;
}

/**
 * Merge keyword and semantic results
 */
function mergeResults(keywordResults, semanticResults, topK) {
  const seen = new Set();
  const merged = [];

  // Add keyword results first (higher precision)
  for (const r of keywordResults) {
    if (!seen.has(r.path)) {
      seen.add(r.path);
      merged.push({ ...r, source: 'keyword' });
    }
  }

  // Add semantic results (higher recall)
  for (const r of semanticResults) {
    if (!seen.has(r.path)) {
      seen.add(r.path);
      merged.push({ ...r, source: 'semantic' });
    }
  }

  // Sort by hybrid score (if available) or similarity
  merged.sort((a, b) => {
    const scoreA = a.finalScore || a.similarity || 0;
    const scoreB = b.finalScore || b.similarity || 0;
    return scoreB - scoreA;
  });

  return merged.slice(0, topK * 2); // Return more candidates for re-ranking
}

/**
 * Format chunk for response
 */
function formatChunk(result, options = {}) {
  const chunk = {
    path: result.path,
    content: result.snippet || result.content || '',
    sectionTitle: result.sectionTitle || '',
    similarity: result.similarity || 0,
    hybridScore: result.finalScore || result.similarity || 0,
    keywordScore: result.keywordScore || 0,
    isGovernanceDoc: result.isGovernanceDoc || false,
    isHardConstraintDoc: result.isHardConstraintDoc || false,
    snippet: (result.snippet || result.content || '').slice(0, 200),
  };

  if (options.includeMetadata !== false) {
    chunk.metadata = result.metadata || {};
  }

  if (!options.includeScores) {
    delete chunk.similarity;
    delete chunk.keywordScore;
  }

  return chunk;
}

/**
 * Compute retrieval hash for caching
 */
function computeRetrievalHash(query, options) {
  const data = {
    query: query.toLowerCase().trim(),
    mode: options.mode || 'hybrid',
    topK: options.topK || 5,
    requireGovernance: options.requireGovernance || false,
  };
  return Buffer.from(JSON.stringify(data)).toString('base64').slice(0, 16);
}

export { retrievalPipeline, mergeResults, formatChunk, computeRetrievalHash };
