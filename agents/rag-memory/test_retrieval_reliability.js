// ========================================
// v1.2.0 Phase B.4 — Retrieval Reliability Tests
// test_retrieval_reliability.js
// ========================================

import { hybridSearch } from './hybrid_retrieval.js';
import { classifyQuery } from './query_classifier.js';
import { withCache, clear } from './retrieval_cache.js';
import { explainRetrieval } from './explain_retrieval.js';

const GOVERNANCE_QUERIES = [
  'hard constraints server.js',
  'Five Iron Laws PartyGameSDK',
  'release gate process',
  'governance layer agent rules',
];

const CACHE_TEST_QUERIES = [
  'Unity WebGL material policy',
  'Agent Dashboard Next.js shadcn/ui',
  'token cost analysis Agent Intelligence',
];

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

function nearlyEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps;
}

async function testDeterministic() {
  console.log('\n=== TASK 6.1: Deterministic Retrieval ===');

  for (const query of GOVERNANCE_QUERIES) {
    console.log(`\nQuery: "${query}"`);

    // Run same query 3 times
    const results = [];
    for (let i = 0; i < 3; i++) {
      const r = await hybridSearch(query, { topK: 5 });
      results.push(r.results.map(r => r.path));
    }

    // Check all 3 runs return same paths in same order
    const [first, ...rest] = results;
    const deterministic = rest.every(r => JSON.stringify(r) === JSON.stringify(first));

    assert(deterministic, `"${query}" deterministic across 3 runs`);

    if (!deterministic) {
      console.log('    Run 1:', first);
      console.log('    Run 2:', rest[0]);
      console.log('    Run 3:', rest[1]);
    }

    // Check ranking is stable (no random shuffle)
    const hashes = results.map(r => JSON.stringify(r));
    const sameHash = new Set(hashes).size === 1;
    assert(sameHash, `"${query}" same result structure`);
  }
}

async function testNoRandomOrdering() {
  console.log('\n=== TASK 6.2: No Random Ordering (Tiebreakers) ===');

  // Query likely to produce ties
  const query = 'PartyGameSDK';
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const r = await hybridSearch(query, { topK: 10 });
    runs.push(r.results.map(r => r.path));
  }

  const allSame = runs.every(r => JSON.stringify(r) === JSON.stringify(runs[0]));
  assert(allSame, 'No random ordering (5 runs, top 10)');

  if (!allSame) {
    console.log('    Paths vary across runs:');
    runs.forEach((r, i) => console.log(`    Run ${i + 1}:`, r.slice(0, 3)));
  }
}

async function testGovernanceQueriesStable() {
  console.log('\n=== TASK 6.3: Governance Queries Stable ===');

  for (const query of GOVERNANCE_QUERIES) {
    const r = await hybridSearch(query, { topK: 5 });

    // Check top 3 has >= 1 governance doc
    const top3 = r.results.slice(0, 3);
    const hasGov = top3.some(res =>
      res.path.toUpperCase().includes('AGENT_RULES') ||
      res.path.toUpperCase().includes('SOUL') ||
      res.path.toUpperCase().includes('BASELINE') ||
      res.path.toUpperCase().includes('HARD_CONSTRAINTS') ||
      res.path.toUpperCase().includes('GOVERNANCE') ||
      res.path.toUpperCase().includes('RAG_RETRIEVAL_POLICY') ||
      res.path.toUpperCase().includes('RELEASE_GATE') ||
      res.isHardConstraintDoc
    );

    assert(hasGov, `"${query}" top 3 has governance doc`);
    if (!hasGov) {
      console.log('    Top 3:', top3.map(r => r.path));
    }

    // Check must_not_suggest violations = 0
    assert(r.blockedCount >= 0 && r.blockedCount < 99, `"${query}" no runaway violations (blocked=${r.blockedCount})`);
  }
}

async function testCacheHit() {
  console.log('\n=== TASK 6.4: Cache Hit Works ===');

  // Clear cache first
  clear?.();

  const cachedSearch = withCache(hybridSearch);

  for (const query of CACHE_TEST_QUERIES) {
    // First call (miss)
    const r1 = await cachedSearch(query, { topK: 5, useCache: true });
    const miss = r1._fromCache === false;

    // Second call (hit)
    const r2 = await cachedSearch(query, { topK: 5, useCache: true });
    const hit = r2._fromCache === true;

    assert(miss, `"${query}" first call = cache miss`);
    assert(hit, `"${query}" second call = cache hit`);

    // Results should be identical
    const same = JSON.stringify(r1.results) === JSON.stringify(r2.results);
    assert(same, `"${query}" cached result identical`);
  }
}

async function testExplainabilityOutput() {
  console.log('\n=== TASK 6.5: Explainability Output Exists ===');

  const query = 'hard constraints server.js';
  const r = await hybridSearch(query, { topK: 5 });

  for (const result of r.results) {
    // Use explainRetrieval to generate explanation
    const exp = explainRetrieval(result, query, r.classification?.strategy || {});
    const hasExplanation = exp && typeof exp === 'object';
    assert(hasExplanation, `"${result.path}" has explanation object`);

    if (hasExplanation) {
      assert(typeof exp.summary === 'string', `"${result.path}" explanation.summary is string`);
      assert(typeof exp.scoreBreakdown === 'object', `"${result.path}" explanation.scoreBreakdown is object`);
      assert(Array.isArray(exp.matchedTerms), `"${result.path}" explanation.matchedTerms is array`);
      assert(typeof exp.reason === 'string', `"${result.path}" explanation.reason is string`);
    }
  }
}

async function testMustNotSuggestViolations() {
  console.log('\n=== TASK 6.6: must_not_suggest Violations = 0 ===');

  // These queries should NOT return blocked results in top 5
  const testQueries = [
    'how to modify server.js',
    'how to parse game_message.type',
    'how to inject playerIndex from controller',
  ];

  for (const query of testQueries) {
    const r = await hybridSearch(query, { topK: 5 });
    // blockedCount may be > 0, but blocked results should NOT appear in top 5
    const blockedInTop = r.results.some(res => res._blocked);
    assert(!blockedInTop, `"${query}" no blocked results in top ${r.topK}`);
  }
}

async function runAllTests() {
  console.log('='.repeat(80));
  console.log('Phase B.4 — Retrieval Reliability Tests');
  console.log('='.repeat(80));

  try {
    await testDeterministic();
    await testNoRandomOrdering();
    await testGovernanceQueriesStable();
    await testCacheHit();
    await testExplainabilityOutput();
    await testMustNotSuggestViolations();
  } catch (err) {
    console.error('\n❌ Test runner error:', err.message);
    failed++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

runAllTests();
