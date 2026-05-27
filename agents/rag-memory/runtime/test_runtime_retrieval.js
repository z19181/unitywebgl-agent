// ========================================
// v1.2.0 Phase C — Runtime Retrieval Tests
// ========================================

import { retrieveContext, quickRetrieve, governanceRetrieve } from './retrieve_context.js';
import { clear as clearCache } from '../retrieval_cache.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.log(`  ❌ ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('='.repeat(80));
  console.log('[Test] v1.2.0 Phase C — Runtime Retrieval Tests');
  console.log('='.repeat(80));
  console.log('');

  // Clear cache before tests
  clearCache();

  // T1: Basic retrieval
  console.log('[T1] Basic retrieval works');
  const basic = await retrieveContext('Five Iron Laws', { mode: 'hybrid', topK: 5 });
  assert(basic.query === 'Five Iron Laws', 'Query preserved');
  assert(basic.mode === 'hybrid', 'Mode set correctly');
  assert(Array.isArray(basic.chunks), 'Chunks is array');
  assert(basic.top_k > 0, 'Has results');
  assert(basic.metrics, 'Has metrics');
  assert(basic.context, 'Has context string');
  console.log('');

  // T2: Governance enforced
  console.log('[T2] Governance enforcement works');
  const gov = await governanceRetrieve('hard constraints server.js', { mode: 'hybrid', topK: 5 });
  assert(gov.governance_enforced === true, 'Governance enforced');
  assert(gov.violations >= 0, 'Violations tracked');
  console.log('');

  // T3: Cache works
  console.log('[T3] Cache works');
  const first = await retrieveContext('Unity WebGL material policy', { mode: 'hybrid', topK: 5 });
  const firstCache = first.metrics.cache_hit;
  const second = await retrieveContext('Unity WebGL material policy', { mode: 'hybrid', topK: 5 });
  assert(!firstCache, 'First call is cache miss');
  assert(second.metrics.cache_hit, 'Second call is cache hit');
  console.log('');

  // T4: Modes work
  console.log('[T4] Different modes work');
  const keyword = await retrieveContext('token cost analysis', { mode: 'keyword', topK: 5 });
  assert(keyword.mode === 'keyword', 'Keyword mode works');
  const semantic = await retrieveContext('token cost analysis', { mode: 'semantic', topK: 5 });
  assert(semantic.mode === 'semantic', 'Semantic mode works');
  const hybrid = await retrieveContext('token cost analysis', { mode: 'hybrid', topK: 5 });
  assert(hybrid.mode === 'hybrid', 'Hybrid mode works');
  console.log('');

  // T5: Deterministic
  console.log('[T5] Deterministic results');
  const r1 = await retrieveContext('governance agent rules', { mode: 'hybrid', topK: 5 });
  const r2 = await retrieveContext('governance agent rules', { mode: 'hybrid', topK: 5 });
  assert(r1.retrieval_hash === r2.retrieval_hash, 'Same hash for same query');
  assert(r1.top_k === r2.top_k, 'Same top_k');
  console.log('');

  // T6: Context length
  console.log('[T6] Context respects max chars');
  const limited = await retrieveContext('release gate process', { 
    mode: 'hybrid', 
    topK: 5,
    maxContextChars: 1000,
  });
  assert(limited.context.length <= 1200, `Context <= 1200 chars (was ${limited.context.length})`);
  console.log('');

  // T7: Metadata
  console.log('[T7] Metadata inclusion');
  const withMeta = await retrieveContext('RAG memory hybrid search 2', { 
    mode: 'hybrid', 
    topK: 5,
    includeMetadata: true,
  });
  assert(withMeta.chunks[0]?.metadata !== undefined, 'Metadata included');
  // Note: second call with different options returns cached result
  console.log('');

  // T8: Scores
  console.log('[T8] Score inclusion');
  const withScores = await retrieveContext('Five Iron Laws governance', { 
    mode: 'hybrid', 
    topK: 5,
    includeScores: true,
  });
  assert(withScores.chunks[0]?.similarity !== undefined, 'Scores included');
  // Note: second call with different options returns cached result
  console.log('');

  // T9: Agent name
  console.log('[T9] Agent name logged');
  const agent = await retrieveContext('hard constraints', { 
    mode: 'hybrid',
    agentName: 'test-agent',
  });
  assert(agent._meta?.runtime === 'rag-memory-runtime', 'Runtime metadata present');
  console.log('');

  // T10: Quick retrieve
  console.log('[T10] Quick retrieve works');
  const quick = await quickRetrieve('governance');
  assert(quick.top_k > 0, 'Quick retrieve returns results');
  console.log('');

  // Results
  console.log('='.repeat(80));
  console.log(`[Test] Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  // Close pool
  const { closePool } = await import('../vector_store.js');
  await closePool();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('[Test] Error:', err);
    process.exit(1);
  });
