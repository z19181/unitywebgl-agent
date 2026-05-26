// ========================================
// v1.2.0 Phase B.2 — Multi-Mode Evaluation
// evaluate_all_modes.js
// 支持 --mode=keyword | --mode=semantic | --mode=hybrid
// 默认运行全部三种模式
// ========================================
const fs = require('fs');
const path = require('path');

// ========================================
// Config
// ========================================
const TEST_QUERIES_PATH = path.join(__dirname, 'test_queries.json');
const OUTPUT_DIR = __dirname;

// ========================================
// Load test queries
// ========================================
function loadTestQueries() {
  if (!fs.existsSync(TEST_QUERIES_PATH)) {
    console.error('[Evaluate] ❌ test_queries.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TEST_QUERIES_PATH, 'utf-8'));
}

// ========================================
// Calculate metrics (same logic as original)
// ========================================
function calculateMetrics(query, results, expectedFiles, mustNotSuggest) {
  const relevantRetrieved = results.filter(r =>
    expectedFiles.some(expected => r.path.includes(expected))
  );
  const numRelevantRetrieved = relevantRetrieved.length;
  const totalRelevant = expectedFiles.length;
  const recallAt5 = totalRelevant > 0 ? numRelevantRetrieved / totalRelevant : 0;
  const precisionAt5 = results.length > 0 ? numRelevantRetrieved / Math.min(results.length, 5) : 0;

  let mrr = 0;
  for (let i = 0; i < results.length; i++) {
    if (expectedFiles.some(expected => results[i].path.includes(expected))) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  let dcg = 0;
  for (let i = 0; i < Math.min(results.length, 5); i++) {
    const rel = expectedFiles.some(expected => results[i].path.includes(expected)) ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
  }
  const numRelevant = Math.min(totalRelevant, 5);
  let idcg = 0;
  for (let i = 0; i < numRelevant; i++) {
    idcg += 1 / Math.log2(i + 2);
  }
  const ndcgAt5 = idcg > 0 ? dcg / idcg : 0;

  const violations = [];
  if (mustNotSuggest && mustNotSuggest.length > 0) {
    for (const result of results) {
      for (const phrase of mustNotSuggest) {
        if (result.snippet.toLowerCase().includes(phrase.toLowerCase())) {
          violations.push({ query, phrase, file: result.path, snippet: result.snippet });
        }
      }
    }
  }

  return { recallAt5, precisionAt5, mrr, ndcgAt5, violations, numRelevantRetrieved, totalRelevant };
}

// ========================================
// Evaluate Keyword Mode
// ========================================
async function evaluateKeyword() {
  console.log('[Evaluate] Mode: KEYWORD — loading query_index.cjs...');
  const { queryIndex } = require('./query_index.cjs');

  const testQueries = loadTestQueries();
  const results = [];
  let totalViolations = 0;
  const violationsList = [];
  const categories = new Set();

  for (const q of testQueries.queries) {
    const queryResults = queryIndex(q.query, { k: 5, silent: true });
    const formattedResults = queryResults.map(r => ({
      path: r.path,
      score: r.score,
      matchedTokens: r.matchedTokens,
      snippet: r.snippet,
    }));

    const metrics = calculateMetrics(q.query, formattedResults, q.expected_files, q.must_not_suggest);
    results.push({
      id: q.id,
      query: q.query,
      category: q.category,
      expected_files: q.expected_files,
      results: formattedResults,
      metrics: {
        recallAt5: metrics.recallAt5,
        precisionAt5: metrics.precisionAt5,
        mrr: metrics.mrr,
        ndcgAt5: metrics.ndcgAt5,
        violations: metrics.violations,
        numRelevantRetrieved: metrics.numRelevantRetrieved,
        totalRelevant: metrics.totalRelevant,
      },
    });

    totalViolations += metrics.violations.length;
    violationsList.push(...metrics.violations.map(v => ({ ...v, query: q.id })));
    categories.add(q.category);
  }

  const meanRecallAt5 = results.reduce((s, r) => s + r.metrics.recallAt5, 0) / results.length;
  const meanPrecisionAt5 = results.reduce((s, r) => s + r.metrics.precisionAt5, 0) / results.length;
  const meanMRR = results.reduce((s, r) => s + r.metrics.mrr, 0) / results.length;
  const meanNDCGAt5 = results.reduce((s, r) => s + r.metrics.ndcgAt5, 0) / results.length;

  console.log(`  Keyword: Recall@5=${meanRecallAt5.toFixed(4)}, MRR=${meanMRR.toFixed(4)}, Violations=${totalViolations}`);

  return {
    mode: 'keyword',
    meanRecallAt5,
    meanPrecisionAt5,
    meanMRR,
    meanNDCGAt5,
    totalViolations,
    violationsList,
    results,
    categories: Array.from(categories),
  };
}

// ========================================
// Evaluate Semantic Mode
// ========================================
async function evaluateSemantic() {
  console.log('[Evaluate] Mode: SEMANTIC — loading retrieve_semantic.js...');
  const { retrieveWithSnippets } = await import('./retrieve_semantic.js');

  const testQueries = loadTestQueries();
  const results = [];
  let totalViolations = 0;
  const violationsList = [];
  const categories = new Set();

  for (const q of testQueries.queries) {
    const queryResults = await retrieveWithSnippets(q.query, { topK: 5 });
    const formattedResults = queryResults.map(r => ({
      path: r.documentPath,
      score: r.bestSimilarity,
      matchedTokens: [],
      snippet: r.snippets[0]?.content || '',
    }));

    const metrics = calculateMetrics(q.query, formattedResults, q.expected_files, q.must_not_suggest);
    results.push({
      id: q.id,
      query: q.query,
      category: q.category,
      expected_files: q.expected_files,
      results: formattedResults,
      metrics: {
        recallAt5: metrics.recallAt5,
        precisionAt5: metrics.precisionAt5,
        mrr: metrics.mrr,
        ndcgAt5: metrics.ndcgAt5,
        violations: metrics.violations,
        numRelevantRetrieved: metrics.numRelevantRetrieved,
        totalRelevant: metrics.totalRelevant,
      },
    });

    totalViolations += metrics.violations.length;
    violationsList.push(...metrics.violations.map(v => ({ ...v, query: q.id })));
    categories.add(q.category);
  }

  const meanRecallAt5 = results.reduce((s, r) => s + r.metrics.recallAt5, 0) / results.length;
  const meanPrecisionAt5 = results.reduce((s, r) => s + r.metrics.precisionAt5, 0) / results.length;
  const meanMRR = results.reduce((s, r) => s + r.metrics.mrr, 0) / results.length;
  const meanNDCGAt5 = results.reduce((s, r) => s + r.metrics.ndcgAt5, 0) / results.length;

  console.log(`  Semantic: Recall@5=${meanRecallAt5.toFixed(4)}, MRR=${meanMRR.toFixed(4)}, Violations=${totalViolations}`);

  return {
    mode: 'semantic',
    meanRecallAt5,
    meanPrecisionAt5,
    meanMRR,
    meanNDCGAt5,
    totalViolations,
    violationsList,
    results,
    categories: Array.from(categories),
  };
}

// ========================================
// Evaluate Hybrid Mode
// ========================================
async function evaluateHybrid() {
  console.log('[Evaluate] Mode: HYBRID — loading hybrid_retrieval.js...');
  const { hybridSearch } = await import('./hybrid_retrieval.js');

  const testQueries = loadTestQueries();
  const results = [];
  let totalViolations = 0;
  const violationsList = [];
  const categories = new Set();
  let totalBlocked = 0;

  for (const q of testQueries.queries) {
    const hybridResult = await hybridSearch(q.query, { topK: 5 });
    const formattedResults = hybridResult.results.map(r => ({
      path: r.path,
      score: r.finalScore,
      matchedTokens: [],
      snippet: r.snippet,
    }));

    const metrics = calculateMetrics(q.query, formattedResults, q.expected_files, q.must_not_suggest);
    results.push({
      id: q.id,
      query: q.query,
      category: q.category,
      expected_files: q.expected_files,
      results: formattedResults,
      metrics: {
        recallAt5: metrics.recallAt5,
        precisionAt5: metrics.precisionAt5,
        mrr: metrics.mrr,
        ndcgAt5: metrics.ndcgAt5,
        violations: metrics.violations,
        numRelevantRetrieved: metrics.numRelevantRetrieved,
        totalRelevant: metrics.totalRelevant,
      },
      hybridMeta: {
        blockedCount: hybridResult.blockedCount,
        totalCandidates: hybridResult.totalCandidates,
        isHardConstraintQuery: hybridResult.isHardConstraintQuery,
      },
    });

    totalViolations += metrics.violations.length;
    totalBlocked += hybridResult.blockedCount;
    violationsList.push(...metrics.violations.map(v => ({ ...v, query: q.id })));
    categories.add(q.category);
  }

  const meanRecallAt5 = results.reduce((s, r) => s + r.metrics.recallAt5, 0) / results.length;
  const meanPrecisionAt5 = results.reduce((s, r) => s + r.metrics.precisionAt5, 0) / results.length;
  const meanMRR = results.reduce((s, r) => s + r.metrics.mrr, 0) / results.length;
  const meanNDCGAt5 = results.reduce((s, r) => s + r.metrics.ndcgAt5, 0) / results.length;

  console.log(`  Hybrid: Recall@5=${meanRecallAt5.toFixed(4)}, MRR=${meanMRR.toFixed(4)}, Violations=${totalViolations}, Blocked=${totalBlocked}`);

  return {
    mode: 'hybrid',
    meanRecallAt5,
    meanPrecisionAt5,
    meanMRR,
    meanNDCGAt5,
    totalViolations,
    totalBlocked,
    violationsList,
    results,
    categories: Array.from(categories),
  };
}

// ========================================
// Format comparison markdown
// ========================================
function formatComparison(allModes) {
  const keyword = allModes.find(m => m.mode === 'keyword');
  const semantic = allModes.find(m => m.mode === 'semantic');
  const hybrid = allModes.find(m => m.mode === 'hybrid');

  const lines = [
    '# RAG Retrieval — Three-Mode Comparison Report',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Test Queries:** 20`,
    '',
    '## Summary Metrics Comparison',
    '',
    `| Metric | Keyword (baseline) | Semantic | Hybrid |`,
    `|--------|-------------------|----------|-------|`,
    `| **Recall@5** | **${keyword.meanRecallAt5.toFixed(4)}** | ${semantic.meanRecallAt5.toFixed(4)} | ${hybrid.meanRecallAt5.toFixed(4)} |`,
    `| **Precision@5** | **${keyword.meanPrecisionAt5.toFixed(4)}** | ${semantic.meanPrecisionAt5.toFixed(4)} | ${hybrid.meanPrecisionAt5.toFixed(4)} |`,
    `| **MRR** | **${keyword.meanMRR.toFixed(4)}** | ${semantic.meanMRR.toFixed(4)} | ${hybrid.meanMRR.toFixed(4)} |`,
    `| **NDCG@5** | **${keyword.meanNDCGAt5.toFixed(4)}** | ${semantic.meanNDCGAt5.toFixed(4)} | ${hybrid.meanNDCGAt5.toFixed(4)} |`,
    `| **must_not_suggest violations** | **${keyword.totalViolations}** | ${semantic.totalViolations} | ${hybrid.totalViolations} |`,
    '',
    '## Phase B.2 Admission Criteria',
    '',
    `| Criterion | Keyword Baseline | Hybrid Target | Hybrid Result | Pass? |`,
    `|-----------|-----------------|--------------|--------------|-------|`,
    `| Recall@5 > 0.375 | 0.3750 | >= 0.3750 | ${hybrid.meanRecallAt5.toFixed(4)} | ${hybrid.meanRecallAt5 >= 0.375 ? '✅' : '❌'} |`,
    `| MRR > 0.2767 | 0.2767 | > 0.2767 | ${hybrid.meanMRR.toFixed(4)} | ${hybrid.meanMRR > 0.2767 ? '✅' : '❌'} |`,
    `| Violations = 0 | 0 | = 0 | ${hybrid.totalViolations} | ${hybrid.totalViolations === 0 ? '✅' : '❌'} |`,
    '',
    '## Per-Query Breakdown (Hybrid)',
    '',
  ];

  for (const r of hybrid.results) {
    const passed = r.metrics.recallAt5 > 0;
    lines.push(`### ${r.id}: "${r.query}" (${passed ? '✅' : '❌'})`);
    lines.push(`- Category: ${r.category}`);
    lines.push(`- Recall@5: ${r.metrics.recallAt5.toFixed(4)} (${r.metrics.numRelevantRetrieved}/${r.metrics.totalRelevant})`);
    lines.push(`- MRR: ${r.metrics.mrr.toFixed(4)}`);
    lines.push(`- Violations: ${r.metrics.violations.length}`);
    if (r.hybridMeta?.isHardConstraintQuery) lines.push(`- ⚠️ Hard constraint query`);
    lines.push('');
  }

  // Failed queries (Recall@5 = 0)
  const failed = hybrid.results.filter(r => r.metrics.recallAt5 === 0);
  if (failed.length > 0) {
    lines.push('## Failed Queries (Recall@5 = 0.0000)');
    lines.push('');
    for (const f of failed) {
      const kwResult = keyword.results.find(r => r.id === f.id);
      const semResult = semantic.results.find(r => r.id === f.id);
      lines.push(`- **${f.id}**: "${f.query}"`);
      lines.push(`  - Category: ${f.category}`);
      lines.push(`  - Keyword Recall@5: ${kwResult?.metrics.recallAt5.toFixed(4) ?? 'N/A'}`);
      lines.push(`  - Semantic Recall@5: ${semResult?.metrics.recallAt5.toFixed(4) ?? 'N/A'}`);
      lines.push(`  - Hybrid Recall@5: ${f.metrics.recallAt5.toFixed(4)}`);
      lines.push(`  - Expected: ${f.expected_files.join(', ')}`);
      lines.push(`  - Hybrid top-5: ${f.results.map(r => r.path).join(' | ')}`);
      lines.push('');
    }
  }

  // Violations
  if (hybrid.violationsList.length > 0) {
    lines.push('## must_not_suggest Violations (Hybrid)');
    lines.push('');
    for (const v of hybrid.violationsList) {
      lines.push(`- **${v.query}**: phrase "${v.phrase}" found in \`${v.file}\``);
      lines.push(`  Snippet: "${v.snippet?.slice(0, 100)}..."`);
      lines.push('');
    }
  }

  // Conclusion
  const recallPass = hybrid.meanRecallAt5 >= 0.375;
  const mrrPass = hybrid.meanMRR > 0.2767;
  const violationPass = hybrid.totalViolations === 0;
  const allPass = recallPass && mrrPass && violationPass;

  lines.push('## Conclusion');
  lines.push('');
  if (allPass) {
    lines.push('✅ **Phase B.2 PASSED** — Hybrid retrieval meets all admission criteria.');
    lines.push('');
    lines.push('| Criterion | Result | Status |');
    lines.push('|-----------|--------|-------|');
    lines.push(`| Recall@5 >= 0.375 | ${hybrid.meanRecallAt5.toFixed(4)} | ✅ |`);
    lines.push(`| MRR > 0.2767 | ${hybrid.meanMRR.toFixed(4)} | ${mrrPass ? '✅' : '❌'} |`);
    lines.push(`| Violations = 0 | ${hybrid.totalViolations} | ${violationPass ? '✅' : '❌'} |`);
  } else {
    lines.push('❌ **Phase B.2 NOT YET PASSED** — Hybrid retrieval does not meet all admission criteria.');
    lines.push('');
    lines.push('| Criterion | Result | Status |');
    lines.push('|-----------|--------|-------|');
    lines.push(`| Recall@5 >= 0.375 | ${hybrid.meanRecallAt5.toFixed(4)} | ${recallPass ? '✅' : '❌'} |`);
    lines.push(`| MRR > 0.2767 | ${hybrid.meanMRR.toFixed(4)} | ${mrrPass ? '✅' : '❌'} |`);
    lines.push(`| Violations = 0 | ${hybrid.totalViolations} | ${violationPass ? '✅' : '❌'} |`);
    lines.push('');
    lines.push('**Next steps (if not passed):**');
    lines.push('1. Analyze failed queries — why hybrid doesn\'t retrieve expected files');
    lines.push('2. Increase governance boost for hard constraint queries');
    lines.push('3. Add path/heading boost tuning');
    lines.push('4. Add BM25-like scoring component');
    lines.push('5. Consider query-specific routing (not: rebuild ground truth)');
  }

  return lines.join('\n');
}

// ========================================
// Main
// ========================================
async function main() {
  const modeArg = process.argv.find(a => a.startsWith('--mode='));
  const targetMode = modeArg ? modeArg.split('=')[1] : 'all';

  console.log('\n' + '='.repeat(80));
  console.log('[Evaluate] v1.2.0 Phase B.2 — Multi-Mode RAG Evaluation');
  console.log(`[Evaluate] Mode: ${targetMode === 'all' ? 'ALL (keyword + semantic + hybrid)' : targetMode.toUpperCase()}`);
  console.log('='.repeat(80) + '\n');

  const allModes = [];

  if (targetMode === 'all' || targetMode === 'keyword') {
    const kw = await evaluateKeyword();
    allModes.push(kw);
  }

  if (targetMode === 'all' || targetMode === 'semantic') {
    const sem = await evaluateSemantic();
    allModes.push(sem);
  }

  if (targetMode === 'all' || targetMode === 'hybrid') {
    const hyb = await evaluateHybrid();
    allModes.push(hyb);
  }

  // Write combined results
  const combinedPath = path.join(OUTPUT_DIR, 'eval_results_all_modes.json');
  // TEMP: commented out for syntax fix
  //   fs.writeFileSync(combinedPath, JSON.stringify({
  //     generatedAt: new Date().toISOString(),
  //     modes: allModes.map(m => ({
  //       mode: m.mode,
  //       summary: {
  //         meanRecallAt5: m.meanRecallAt5,
  //         meanPrecisionAt5: m.meanPrecisionAt5,
  //         meanMRR: m.meanMRR,
  //         meanNDCGAt5: m.meanNDCGAt5,
  //         totalViolations: m.totalViolations,
  //         totalBlocked: m.totalBlocked || 0,
  //         results: m.results.map(r => ({
  //         id: r.id,
  //         query: r.query,
  //         category: r.category,
  //         expected_files: r.expected_files,
  //         recallAt5: r.metrics.recallAt5,
  //         precisionAt5: r.metrics.precisionAt5,
  //         mrr: r.metrics.mrr,
  //         ndcgAt5: r.metrics.ndcgAt5,
  //         violations: r.metrics.violations.length,
  //         top5: r.results.map(res => ({ path: res.path, score: res.score })),
  //       }),
  //     })), null, 2), 'utf-8');
  //   console.log(`\n[Evaluate] ✅ eval_results_all_modes.json written (${fs.statSync(combinedPath).size} bytes)`);
  // 
  //   // Write markdown comparison
  //   const mdPath = path.join(OUTPUT_DIR, 'eval_results_all_modes.md');
  //   const mdContent = formatComparison(allModes);
  //   fs.writeFileSync(mdPath, mdContent, 'utf-8');
  //   console.log(`[Evaluate] ✅ eval_results_all_modes.md written (${fs.statSync(mdPath).size} bytes)`);
  // 
  //   // Print summary table
  //   console.log('\n' + '='.repeat(80));
  //   console.log('[Evaluate] FINAL SUMMARY');
  //   console.log('='.repeat(80));
  //   for (const m of allModes) {
  //     console.log(`\n  [${m.mode.toUpperCase()}]`);
  //     console.log(`    Recall@5:    ${m.meanRecallAt5.toFixed(4)}`);
  //     console.log(`    Precision@5: ${m.meanPrecisionAt5.toFixed(4)}`);
  //     console.log(`    MRR:         ${m.meanMRR.toFixed(4)}`);
  //     console.log(`    NDCG@5:      ${m.meanNDCGAt5.toFixed(4)}`);
  //     console.log(`    Violations:  ${m.totalViolations}`);
  //     if (m.totalBlocked) console.log(`    Blocked:     ${m.totalBlocked}`);
  //   }
  // 
  //   const hybrid = allModes.find(m => m.mode === 'hybrid');
  //   if (hybrid) {
  //     console.log('\n  [HYBRID vs KEYWORD BASELINE]');
  //     console.log(`    Recall@5: ${hybrid.meanRecallAt5.toFixed(4)} vs 0.3750  ${hybrid.meanRecallAt5 >= 0.375 ? '✅' : '❌'}`);
  //     console.log(`    MRR:      ${hybrid.meanMRR.toFixed(4)} vs 0.2767     ${hybrid.meanMRR > 0.2767 ? '✅' : '❌'}`);
  //     console.log(`    Violations: ${hybrid.totalViolations} vs 0          ${hybrid.totalViolations === 0 ? '✅' : '❌'}`);
  //     const allPass = hybrid.meanRecallAt5 >= 0.375 && hybrid.meanMRR > 0.2767 && hybrid.totalViolations === 0;
  //     console.log(`\n  Phase B.2: ${allPass ? '✅ PASSED' : '❌ NOT YET PASSED'}`);
  //   }
  // 
  //   console.log('\n[Evaluate] ✅ DONE\n');
  //   process.exit(0);
  // }
  // 
  // main().catch(err => {
  //   console.error('[Evaluate] ❌ FAILED:', err.message);
  //   process.exit(1);
  // });