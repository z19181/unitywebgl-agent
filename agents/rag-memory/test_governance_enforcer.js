// test_governance_enforcer.js
// v1.2.0 Phase B.4.1 — Governance Enforcer Integration Tests
// Run: node test_governance_enforcer.js

import {
  enforceGovernanceResults,
  hasGovernanceIntent,
  isGovernanceResult,
} from './governance_enforcer.js';
import { hybridSearch } from './hybrid_retrieval.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

async function main() {
  console.log('[GovernanceEnforcer] Tests starting...\n');

  // T1: hasGovernanceIntent() correctly identifies governance queries
  console.log('[T1] hasGovernanceIntent() identification');
  assert(hasGovernanceIntent('server.js hard constraints', null), 'should identify server.js query as governance');
  assert(hasGovernanceIntent('Five Iron Laws rules', null), 'should identify Five Iron Laws query as governance');
  assert(hasGovernanceIntent('RELEASE_STATE.json update', null), 'should identify RELEASE_STATE query as governance');
  assert(hasGovernanceIntent('game_message.type protocol', null), 'should identify game_message.type query as governance');
  assert(hasGovernanceIntent('playerIndex injection', null), 'should identify playerIndex query as governance');
  assert(hasGovernanceIntent('git tag creation', null), 'should identify git tag query as governance');
  assert(!hasGovernanceIntent('Unity WebGL material policy', null), 'should NOT identify material query as governance');
  assert(!hasGovernanceIntent('embedding architecture', null), 'should NOT identify embedding query as governance');
  // Test with category
  assert(hasGovernanceIntent('update file', 'hard_constraints'), 'should identify hard_constraints category as governance');
  assert(hasGovernanceIntent('merge branch', 'git_governance'), 'should identify git_governance category as governance');
  assert(!hasGovernanceIntent('update file', 'general'), 'should NOT identify general category as governance');
  console.log('');

  // T2: isGovernanceResult() correctly identifies governance results
  console.log('[T2] isGovernanceResult() identification');
  assert(isGovernanceResult({ path: 'docs/HARD_CONSTRAINTS.md' }), 'should identify HARD_CONSTRAINTS path as governance');
  assert(isGovernanceResult({ path: 'docs/AGENT_RULES.md' }), 'should identify AGENT_RULES path as governance');
  assert(isGovernanceResult({ path: 'docs/SOUL.md' }), 'should identify SOUL path as governance');
  assert(isGovernanceResult({ title: 'Five Iron Laws' }), 'should identify Five Iron Laws title as governance');
  assert(isGovernanceResult({ heading: 'server.js hard constraints' }), 'should identify server.js heading as governance');
  assert(isGovernanceResult({ snippet: 'RELEASE_STATE.json must not be modified' }), 'should identify RELEASE_STATE snippet as governance');
  assert(isGovernanceResult({ content: 'playerIndex is injected by server' }), 'should identify playerIndex content as governance');
  assert(isGovernanceResult({ metadata: { tags: ['protocol', 'governance'] } }), 'should identify metadata tags as governance');
  assert(!isGovernanceResult({ path: 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md' }), 'should NOT identify Material Policy as governance');
  assert(!isGovernanceResult({ path: 'prompts/codex_task.prompt.md' }), 'should NOT identify prompt as governance');
  console.log('');

  // T3: enforceGovernanceResults() does nothing for non-governance queries
  console.log('[T3] Non-governance query (no enforcement)');
  const results_non_gov = [
    { path: 'docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md', finalScore: 0.9 },
    { path: 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md', finalScore: 0.8 },
  ];
  const enforced_non_gov = enforceGovernanceResults('Unity WebGL material policy', results_non_gov, { topK: 5 });
  assert(enforced_non_gov.length === 2, 'should return same length for non-governance query');
  assert(enforced_non_gov[0].path === results_non_gov[0].path, 'should preserve order for non-governance query');
  console.log('');

  // T4: enforceGovernanceResults() enforces governance for governance queries
  console.log('[T4] Governance query enforcement');
  const results_gov = [
    { path: 'docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md', finalScore: 0.9 },
    { path: 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md', finalScore: 0.8 },
    { path: 'docs/AGENT_RULES.md', finalScore: 0.7 },  // governance doc at position 3
  ];
  const enforced_gov = enforceGovernanceResults('server.js hard constraints', results_gov, { topK: 5 });
  assert(enforced_gov.length >= 3, 'should have at least 3 results');
  // The governance doc should be in top 3 after enforcement
  const top3_has_gov = enforced_gov.slice(0, 3).some(r => isGovernanceResult(r));
  assert(top3_has_gov, 'should have governance doc in top 3 after enforcement');
  console.log('');

  // T5: enforceGovernanceResults() promotes governance doc if not in top 3
  console.log('[T5] Governance promotion test');
  const results_promote = [
    { path: 'docs/EMBEDDING_ARCHITECTURE.md', finalScore: 0.9 },
    { path: 'UnityExamples/MATERIAL_POLICY.md', finalScore: 0.8 },
    { path: 'docs/RAG_OVERVIEW.md', finalScore: 0.75 },
    { path: 'docs/HARD_CONSTRAINTS.md', finalScore: 0.7 },  // governance doc at position 4
    { path: 'docs/GENERAL.md', finalScore: 0.65 },
  ];
  const enforced_promote = enforceGovernanceResults('server.js protocol', results_promote, { topK: 5 });
  assert(enforced_promote.length >= 3, 'should have at least 3 results');
  const top3_promote_has_gov = enforced_promote.slice(0, 3).some(r => isGovernanceResult(r));
  assert(top3_promote_has_gov, 'should have governance doc in top 3 after promotion');
  // Check that the governance doc was promoted (not just kept at original position)
  const govInTop3 = enforced_promote.slice(0, 3).find(r => isGovernanceResult(r));
  assert(govInTop3._governanceInjected === true, 'should mark injected governance doc');
  console.log('');

  // T6: enforceGovernanceResults() does not fake results
  console.log('[T6] No fake results');
  const results_no_gov = [
    { path: 'docs/V1_2_0_EMBEDDING_ARCHITECTURE_DECISION.md', finalScore: 0.9 },
    { path: 'UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md', finalScore: 0.8 },
  ];
  const enforced_no_gov = enforceGovernanceResults('server.js hard constraints', results_no_gov, { topK: 5 });
  const paths = enforced_no_gov.map(r => r.path);
  assert(!paths.some(p => p && p.includes('FAKE')), 'should NOT have fake results');
  assert(enforced_no_gov.length === 2, 'should not add non-existent results');
  console.log('');

  // T7: hybridSearch() integrates governance enforcer (integration test)
  console.log('[T7] hybridSearch() governance integration');
  try {
    const result = await hybridSearch('server.js hard constraints', { topK: 5 });
    assert(result.results !== undefined, 'should have results');
    assert(Array.isArray(result.results), 'results should be array');
    // Check if governance doc is in top 3 for governance query
    const top3 = result.results.slice(0, 3);
    const hasGov = top3.some(r => isGovernanceResult(r));
    assert(hasGov, 'governance query should have governance doc in top 3');
    console.log('  ✅ hybridSearch() returned results with governance enforcement');
  } catch (err) {
    failed++;
    console.error(`  ❌ hybridSearch() integration failed: ${err.message}`);
  }
  console.log('');

  // Summary
  console.log('='.repeat(60));
  console.log(`[GovernanceEnforcer] Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
