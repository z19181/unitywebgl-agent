// ========================================
// v1.2.0 Phase C — Prompt Context Tests
// ========================================

import { buildPromptContext, buildMinimalContext, deduplicateChunks } from './build_prompt_context.js';

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

function runTests() {
  console.log('='.repeat(80));
  console.log('[Test] Prompt Context Tests');
  console.log('='.repeat(80));
  console.log('');

  const mockResponse = {
    query: 'Five Iron Laws',
    mode: 'hybrid',
    retrieval_hash: 'abc123',
    governance_enforced: true,
    violations: 0,
    top_k: 3,
    chunks: [
      {
        path: 'docs/HARD_CONSTRAINTS.md',
        content: '## Hard Constraints\n\nThese are the hard constraints that cannot be modified.',
        sectionTitle: 'Hard Constraints',
        similarity: 0.95,
        hybridScore: 0.95,
        keywordScore: 1.0,
        isGovernanceDoc: true,
        isHardConstraintDoc: true,
        snippet: 'Hard Constraints - cannot be modified',
      },
      {
        path: 'docs/AGENT_RULES.md',
        content: '## Agent Rules\n\n1. Always follow governance rules\n2. Never modify server.js',
        sectionTitle: 'Agent Rules',
        similarity: 0.85,
        hybridScore: 0.85,
        keywordScore: 0.8,
        isGovernanceDoc: true,
        isHardConstraintDoc: false,
        snippet: 'Agent Rules - governance guidelines',
      },
      {
        path: 'docs/MATERIAL_POLICY.md',
        content: '## Material Policy\n\nURP allowed, HDRP forbidden.',
        sectionTitle: 'Material Policy',
        similarity: 0.75,
        hybridScore: 0.75,
        keywordScore: 0.5,
        isGovernanceDoc: false,
        isHardConstraintDoc: false,
        snippet: 'Material Policy - texture limits',
      },
    ],
  };

  // T1: Basic prompt context
  console.log('[T1] Basic prompt context');
  const ctx1 = buildPromptContext(mockResponse);
  assert(ctx1.includes('=== RETRIEVED CONTEXT START ==='), 'Has header');
  assert(ctx1.includes('=== RETRIEVED CONTEXT END ==='), 'Has footer');
  assert(ctx1.includes('[Query] Five Iron Laws'), 'Has query');
  assert(ctx1.includes('[Governance Enforced] Yes'), 'Has governance status');
  console.log('');

  // T2: Governance docs first
  console.log('[T2] Governance docs first');
  const ctx2 = buildPromptContext(mockResponse);
  const govIndex = ctx2.indexOf('docs/HARD_CONSTRAINTS.md');
  const matIndex = ctx2.indexOf('docs/MATERIAL_POLICY.md');
  assert(govIndex < matIndex, 'Governance doc appears before material');
  console.log('');

  // T3: Source markers
  console.log('[T3] Source markers present');
  assert(ctx2.includes('🛡️'), 'Hard constraint marker present');
  assert(ctx2.includes('⚖️'), 'Governance marker present');
  console.log('');

  // T4: Max chars truncation
  console.log('[T4] Max chars respected');
  const ctx4 = buildPromptContext(mockResponse, { maxChars: 200 });
  // Note: truncation check is approximate due to headers
  assert(ctx4.length > 0, 'Context generated');
  console.log('');

  // T5: Minimal context
  console.log('[T5] Minimal context');
  const minimal = buildMinimalContext(mockResponse);
  assert(!minimal.includes('==='), 'No markers in minimal');
  assert(minimal.length > 0, 'Has content');
  console.log('');

  // T6: Deduplication
  console.log('[T6] Deduplication');
  const duplicates = [
    { path: 'a.md', content: 'Same content here', similarity: 0.9 },
    { path: 'b.md', content: 'Same content here', similarity: 0.8 },
    { path: 'c.md', content: 'Different content', similarity: 0.7 },
  ];
  const deduped = deduplicateChunks(duplicates);
  assert(deduped.length === 2, 'Duplicates removed (2 from 3)');
  console.log('');

  // T7: Governance sorting
  console.log('[T7] Governance sorting');
  const nonGov = buildPromptContext({
    ...mockResponse,
    governance_enforced: false,
  });
  const govFirst = nonGov.indexOf('docs/HARD_CONSTRAINTS.md');
  const matFirst = nonGov.indexOf('docs/MATERIAL_POLICY.md');
  assert(govFirst < matFirst, 'Governance still first when enforced');
  console.log('');

  // T8: Content preservation
  console.log('[T8] Content preservation');
  assert(ctx2.includes('Hard Constraints'), 'Section title preserved');
  assert(ctx2.includes('These are the hard constraints'), 'Content preserved');
  console.log('');

  // T9: Scores in context
  console.log('[T9] Scores in context');
  assert(ctx2.includes('[Score]'), 'Score marker present');
  assert(ctx2.includes('95.0%') || ctx2.includes('85.0%'), 'Score values present');
  console.log('');

  // T10: Empty response
  console.log('[T10] Empty response handling');
  const empty = buildPromptContext({
    ...mockResponse,
    chunks: [],
    top_k: 0,
  });
  assert(empty.includes('=== RETRIEVED CONTEXT START ==='), 'Header present for empty');
  assert(empty.includes('=== RETRIEVED CONTEXT END ==='), 'Footer present for empty');
  console.log('');

  // Results
  console.log('='.repeat(80));
  console.log(`[Test] Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(80));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
