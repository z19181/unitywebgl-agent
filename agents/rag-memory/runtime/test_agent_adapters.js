// ========================================
// v1.2.0 Phase C — Agent Adapters Tests
// ========================================

import { 
  createReleaseManagerAdapter,
  createRagMemoryAdapter,
  createTokenCostAdapter,
  createRuntimeTriageAdapter,
  createModelRouterAdapter,
} from '../../runtime-adapters/index.js';

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
  console.log('[Test] Agent Adapters Tests');
  console.log('='.repeat(80));
  console.log('');

  // T1: Release Manager Adapter
  console.log('[T1] Release Manager Adapter');
  const releaseAdapter = createReleaseManagerAdapter();
  assert(releaseAdapter.name === 'release-manager', 'Adapter name correct');
  assert(typeof releaseAdapter.getReleaseGateContext === 'function', 'getReleaseGateContext exists');
  assert(typeof releaseAdapter.getGovernanceContext === 'function', 'getGovernanceContext exists');
  assert(typeof releaseAdapter.getVersionHistoryContext === 'function', 'getVersionHistoryContext exists');
  
  const releaseCtx = await releaseAdapter.getReleaseGateContext('test query');
  assert(releaseCtx.top_k > 0, 'Returns results');
  assert(releaseCtx.governance_enforced, 'Governance enforced');
  console.log('');

  // T2: RAG Memory Adapter
  console.log('[T2] RAG Memory Adapter');
  const ragAdapter = createRagMemoryAdapter();
  assert(ragAdapter.name === 'rag-memory', 'Adapter name correct');
  assert(typeof ragAdapter.getConfigContext === 'function', 'getConfigContext exists');
  assert(typeof ragAdapter.getEmbeddingContext === 'function', 'getEmbeddingContext exists');
  assert(typeof ragAdapter.getGovernanceAwareContext === 'function', 'getGovernanceAwareContext exists');
  
  const ragCtx = await ragAdapter.getConfigContext('test query');
  assert(ragCtx.top_k > 0, 'Returns results');
  console.log('');

  // T3: Token Cost Adapter
  console.log('[T3] Token Cost Adapter');
  const tokenAdapter = createTokenCostAdapter();
  assert(tokenAdapter.name === 'token-cost', 'Adapter name correct');
  assert(typeof tokenAdapter.getCostEstimationContext === 'function', 'getCostEstimationContext exists');
  assert(typeof tokenAdapter.getModelPricingContext === 'function', 'getModelPricingContext exists');
  assert(typeof tokenAdapter.getOptimizationContext === 'function', 'getOptimizationContext exists');
  
  const tokenCtx = await tokenAdapter.getCostEstimationContext('test query');
  assert(tokenCtx.top_k > 0, 'Returns results');
  console.log('');

  // T4: Runtime Triage Adapter
  console.log('[T4] Runtime Triage Adapter');
  const triageAdapter = createRuntimeTriageAdapter();
  assert(triageAdapter.name === 'runtime-triage', 'Adapter name correct');
  assert(typeof triageAdapter.getDiagnosisContext === 'function', 'getDiagnosisContext exists');
  assert(typeof triageAdapter.getErrorPatternsContext === 'function', 'getErrorPatternsContext exists');
  assert(typeof triageAdapter.getConstraintsContext === 'function', 'getConstraintsContext exists');
  
  const triageCtx = await triageAdapter.getDiagnosisContext('test error');
  assert(triageCtx.top_k > 0, 'Returns results');
  console.log('');

  // T5: Model Router Adapter
  console.log('[T5] Model Router Adapter');
  const routerAdapter = createModelRouterAdapter();
  assert(routerAdapter.name === 'model-router', 'Adapter name correct');
  assert(typeof routerAdapter.getRoutingContext === 'function', 'getRoutingContext exists');
  assert(typeof routerAdapter.getModelComparisonContext === 'function', 'getModelComparisonContext exists');
  assert(typeof routerAdapter.getFallbackContext === 'function', 'getFallbackContext exists');
  
  const routerCtx = await routerAdapter.getRoutingContext('test routing');
  assert(routerCtx.top_k > 0, 'Returns results');
  console.log('');

  // T6: All adapters return consistent structure
  console.log('[T6] Consistent response structure');
  for (const adapter of [releaseAdapter, ragAdapter, tokenAdapter, triageAdapter, routerAdapter]) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(adapter)).filter(m => m !== 'constructor');
    assert(methods.length >= 3, `${adapter.name} has multiple methods`);
  }
  console.log('');

  // T7: Agent name in metadata
  console.log('[T7] Agent name in metadata');
  assert(releaseCtx._meta?.runtime === 'rag-memory-runtime', 'Runtime metadata present');
  console.log('');

  // Close pool
  const { closePool } = await import('../vector_store.js');
  await closePool();

  // Results
  console.log('='.repeat(80));
  console.log(`[Test] Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

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
