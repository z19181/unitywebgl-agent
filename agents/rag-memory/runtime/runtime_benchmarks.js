// ========================================
// v1.2.0 Phase C — Runtime Benchmarks
// Benchmark retrieval latency and performance
// ========================================

import { retrieveContext, governanceRetrieve } from './retrieve_context.js';

/**
 * Benchmark results
 */
const BENCHMARK_QUERIES = [
  'Five Iron Laws PartyGameSDK',
  'Unity WebGL material policy',
  'hard constraints server.js',
  'release gate process',
  'RAG retrieval hybrid search',
];

/**
 * Run all benchmarks
 */
async function runBenchmarks() {
  console.log('='.repeat(80));
  console.log('[Benchmark] v1.2.0 Phase C — Runtime Benchmarks');
  console.log('='.repeat(80));
  console.log('');

  const results = {
    retrieval_latency: [],
    cache_hit_latency: [],
    governance_enforcement: [],
    avg_chunk_count: 0,
    avg_context_chars: 0,
    total_runs: 0,
  };

  // 1. Cold retrieval latency (no cache)
  console.log('[Benchmark] Testing cold retrieval latency...');
  await clearCache();
  
  for (const query of BENCHMARK_QUERIES) {
    const start = Date.now();
    const response = await retrieveContext(query, { mode: 'hybrid', topK: 5 });
    const latency = Date.now() - start;
    
    results.retrieval_latency.push(latency);
    results.avg_chunk_count += response.top_k;
    results.avg_context_chars += (response.context || '').length;
    results.total_runs++;
    
    const cacheStatus = response.metrics.cache_hit ? 'HIT' : 'MISS';
    console.log(`  ${query.slice(0, 40):40s} -> ${latency}ms [${cacheStatus}]`);
  }

  // 2. Cache hit latency
  console.log('\n[Benchmark] Testing cache hit latency...');
  
  for (const query of BENCHMARK_QUERIES) {
    const start = Date.now();
    const response = await retrieveContext(query, { mode: 'hybrid', topK: 5 });
    const latency = Date.now() - start;
    
    if (response.metrics.cache_hit) {
      results.cache_hit_latency.push(latency);
      console.log(`  ${query.slice(0, 40):40s} -> ${latency}ms [HIT]`);
    } else {
      console.log(`  ${query.slice(0, 40):40s} -> ${latency}ms [MISS - retrying]`);
      // Retry for cache hit
      const retry = await retrieveContext(query, { mode: 'hybrid', topK: 5 });
      const retryLatency = Date.now() - start;
      if (retry.metrics.cache_hit) {
        results.cache_hit_latency.push(retryLatency);
        console.log(`  [Retry] -> ${retryLatency}ms [HIT]`);
      }
    }
  }

  // 3. Governance enforcement frequency
  console.log('\n[Benchmark] Testing governance enforcement...');
  
  const governanceQueries = [
    'hard constraints server.js',
    'Five Iron Laws',
    'release gate process',
  ];
  
  let governanceEnforced = 0;
  for (const query of governanceQueries) {
    const response = await governanceRetrieve(query, { mode: 'hybrid', topK: 5 });
    if (response.governance_enforced) {
      governanceEnforced++;
    }
    console.log(`  ${query.slice(0, 40):40s} -> ${response.governance_enforced ? 'ENFORCED' : 'not enforced'}`);
  }
  results.governance_enforcement.push(governanceEnforced);

  // 4. Summary
  console.log('\n' + '='.repeat(80));
  console.log('[Benchmark] SUMMARY');
  console.log('='.repeat(80));
  
  const avgLatency = results.retrieval_latency.length > 0 
    ? results.retrieval_latency.reduce((a, b) => a + b, 0) / results.retrieval_latency.length 
    : 0;
  
  const avgCacheHit = results.cache_hit_latency.length > 0
    ? results.cache_hit_latency.reduce((a, b) => a + b, 0) / results.cache_hit_latency.length
    : 0;
  
  const avgChunks = results.avg_chunk_count / results.total_runs;
  const avgChars = results.avg_context_chars / results.total_runs;
  
  console.log(`  Cold Retrieval Latency: ${avgLatency.toFixed(1)}ms (avg of ${results.retrieval_latency.length} runs)`);
  console.log(`  Cache Hit Latency:     ${avgCacheHit.toFixed(1)}ms (avg of ${results.cache_hit_latency.length} runs)`);
  console.log(`  Avg Chunk Count:       ${avgChunks.toFixed(1)}`);
  console.log(`  Avg Context Chars:     ${Math.round(avgChars)}`);
  console.log(`  Governance Enforced:   ${governanceEnforced}/${governanceQueries.length}`);
  console.log('');
  
  // Targets
  console.log('[Benchmark] TARGETS:');
  const latencyPass = avgLatency < 250 ? '✅' : '❌';
  const cachePass = avgCacheHit < 20 ? '✅' : '❌';
  console.log(`  Retrieval < 250ms: ${latencyPass} (actual: ${avgLatency.toFixed(1)}ms)`);
  console.log(`  Cache hit < 20ms:  ${cachePass} (actual: ${avgCacheHit.toFixed(1)}ms)`);
  
  // Close pool
  const { closePool } = await import('../vector_store.js');
  await closePool();
  
  return results;
}

/**
 * Clear retrieval cache
 */
async function clearCache() {
  const { clear } = await import('../retrieval_cache.js');
  clear();
  console.log('[Benchmark] Cache cleared');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  runBenchmarks()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Benchmark] Error:', err);
      process.exit(1);
    });
}

export { runBenchmarks, clearCache, BENCHMARK_QUERIES };
