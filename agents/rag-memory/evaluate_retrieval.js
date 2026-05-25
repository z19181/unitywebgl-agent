const fs = require('fs');
const path = require('path');
const { queryIndex, loadIndex } = require('./query_index.js');

// ========================================
// v1.2.0 Phase A.1 — RAG Evaluation Harness
// evaluate_retrieval.js
// 功能：评测 RAG retrieval 性能
//       计算 Recall@5, Precision@5, MRR, NDCG@5, must_not_suggest violations
// 用法：node agents/rag-memory/evaluate_retrieval.js
// ========================================

const TEST_QUERIES_PATH = path.join(__dirname, 'test_queries.json');
const EVAL_RESULTS_JSON = path.join(__dirname, 'eval_results.json');
const EVAL_RESULTS_MD = path.join(__dirname, 'eval_results.md');

// ========================================
// 工具函数
// ========================================

function loadTestQueries() {
  if (!fs.existsSync(TEST_QUERIES_PATH)) {
    console.error('[Evaluate] ❌ test_queries.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TEST_QUERIES_PATH, 'utf-8'));
}

function calculateMetrics(query, results, expectedFiles, mustNotSuggest) {
  // 1. Relevant retrieved (expected_files 出现在 results 中)
  const relevantRetrieved = results.filter(r =>
    expectedFiles.some(expected => r.path.includes(expected))
  );
  const numRelevantRetrieved = relevantRetrieved.length;

  // 2. Total relevant (expected_files 总数)
  const totalRelevant = expectedFiles.length;

  // 3. Recall@5 = relevant retrieved / total relevant
  const recallAt5 = totalRelevant > 0 ? numRelevantRetrieved / totalRelevant : 0;

  // 4. Precision@5 = relevant retrieved / 5
  const precisionAt5 = results.length > 0 ? numRelevantRetrieved / Math.min(results.length, 5) : 0;

  // 5. MRR (Mean Reciprocal Rank)
  let mrr = 0;
  for (let i = 0; i < results.length; i++) {
    if (expectedFiles.some(expected => results[i].path.includes(expected))) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  // 6. NDCG@5 (Normalized Discounted Cumulative Gain)
  let dcg = 0;
  let idcg = 0;

  // DCG = sum(rel_i / log2(i + 2)) for i = 1..5
  for (let i = 0; i < Math.min(results.length, 5); i++) {
    const rel = expectedFiles.some(expected => results[i].path.includes(expected)) ? 1 : 0;
    dcg += rel / Math.log2(i + 2);
  }

  // IDCG = DCG of ideal ranking (relevant items first)
  const numRelevant = Math.min(totalRelevant, 5);
  for (let i = 0; i < numRelevant; i++) {
    idcg += 1 / Math.log2(i + 2);
  }

  const ndcgAt5 = idcg > 0 ? dcg / idcg : 0;

  // 7. must_not_suggest violations
  const violations = [];
  if (mustNotSuggest && mustNotSuggest.length > 0) {
    for (const result of results) {
      for (const phrase of mustNotSuggest) {
        if (result.snippet.toLowerCase().includes(phrase.toLowerCase())) {
          violations.push({
            query: query,
            phrase: phrase,
            file: result.path,
            snippet: result.snippet,
          });
        }
      }
    }
  }

  return {
    recallAt5,
    precisionAt5,
    mrr,
    ndcgAt5,
    violations,
    numRelevantRetrieved,
    totalRelevant,
  };
}

function formatResults(evalResults) {
  const lines = [
    '# RAG Retrieval Evaluation Results',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    `**Test Queries:** ${evalResults.summary.totalQueries}`,
    `**Categories:** ${evalResults.summary.categories.join(', ')}`,
    '',
    '## Summary Metrics',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Recall@5** | **${evalResults.summary.meanRecallAt5.toFixed(4)}** |`,
    `| **Precision@5** | **${evalResults.summary.meanPrecisionAt5.toFixed(4)}** |`,
    `| **MRR** | **${evalResults.summary.meanMRR.toFixed(4)}** |`,
    `| **NDCG@5** | **${evalResults.summary.meanNDCGAt5.toFixed(4)}** |`,
    `| **must_not_suggest Violations** | **${evalResults.summary.totalViolations}** |`,
    '',
    '## Per-Query Results',
    '',
  ];

  for (const r of evalResults.results) {
    lines.push(`### ${r.id}: "${r.query}"`);
    lines.push(`- **Category:** ${r.category}`);
    lines.push(`- **Recall@5:** ${r.metrics.recallAt5.toFixed(4)} (${r.metrics.numRelevantRetrieved}/${r.metrics.totalRelevant})`);
    lines.push(`- **Precision@5:** ${r.metrics.precisionAt5.toFixed(4)}`);
    lines.push(`- **MRR:** ${r.metrics.mrr.toFixed(4)}`);
    lines.push(`- **NDCG@5:** ${r.metrics.ndcgAt5.toFixed(4)}`);
    lines.push(`- **Violations:** ${r.metrics.violations.length}`);
    if (r.metrics.violations.length > 0) {
      lines.push('  - **Details:**');
      for (const v of r.metrics.violations) {
        lines.push(`    - Phrase: "${v.phrase}"`);
        lines.push(`      File: \`${v.file}\``);
        lines.push(`      Snippet: "${v.snippet.slice(0, 100)}..."`);
      }
    }
    lines.push('');
    lines.push('**Top-5 Results:**');
    for (let i = 0; i < r.results.length; i++) {
      const res = r.results[i];
      const isRelevant = r.expected_files.some(expected => res.path.includes(expected));
      lines.push(`  ${i + 1}. \`${res.path}\` (score: ${res.score.toFixed(4)}, relevant: ${isRelevant ? '✅' : '❌'})`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  if (evalResults.summary.totalViolations > 0) {
    lines.push('## Violations Summary');
    lines.push('');
    lines.push('| Query | Phrase | File |');
    lines.push('|--------|---------|------|');
    for (const v of evalResults.summary.violationsList) {
      lines.push(`| ${v.query} | "${v.phrase}" | \`${v.file}\` |`);
    }
    lines.push('');
  }

  lines.push('## Phase B Admission Criteria');
  lines.push('');
  lines.push('To admit Phase B (Embedding + pgvector), the following criteria MUST be met:');
  lines.push('');
  lines.push('1. **Recall@5 >= baseline** (current keyword retrieval)');
  lines.push('2. **MRR > baseline**');
  lines.push('3. **must_not_suggest violations = 0**');
  lines.push('4. **Precision@5 > baseline** (optional, but recommended)');
  lines.push('5. **NDCG@5 > baseline** (optional, but recommended)');
  lines.push('');
  lines.push('**Current Baseline:**');
  lines.push(`- Recall@5 = ${evalResults.summary.meanRecallAt5.toFixed(4)}`);
  lines.push(`- Precision@5 = ${evalResults.summary.meanPrecisionAt5.toFixed(4)}`);
  lines.push(`- MRR = ${evalResults.summary.meanMRR.toFixed(4)}`);
  lines.push(`- NDCG@5 = ${evalResults.summary.meanNDCGAt5.toFixed(4)}`);
  lines.push(`- must_not_suggest violations = ${evalResults.summary.totalViolations}`);
  lines.push('');
  lines.push('**Phase B is allowed ONLY if all criteria are met.**');

  return lines.join('\n');
}

// ========================================
// Main
// ========================================

if (require.main === module) {
  console.log('[Evaluate] Starting RAG retrieval evaluation...\n');

  // 1. Load test queries
  const testQueries = loadTestQueries();
  console.log(`[Evaluate] Loaded ${testQueries.queries.length} test queries\n`);

  // 2. Run evaluation
  const results = [];
  let totalViolations = 0;
  const violationsList = [];
  const categories = new Set();

  for (const q of testQueries.queries) {
    console.log(`[Evaluate] Processing ${q.id}: "${q.query}"...`);

    // Call queryIndex (imported from query_index.js)
    const queryResults = queryIndex(q.query, { k: 5, silent: true });

    // Calculate metrics
    const metrics = calculateMetrics(q.query, queryResults, q.expected_files, q.must_not_suggest);

    results.push({
      id: q.id,
      query: q.query,
      category: q.category,
      expected_files: q.expected_files,
      results: queryResults.map(r => ({
        path: r.path,
        score: r.score,
        matchedTokens: r.matchedTokens,
        snippet: r.snippet,
      })),
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

    console.log(`[Evaluate]   ✅ Recall@5: ${metrics.recallAt5.toFixed(4)}, MRR: ${metrics.mrr.toFixed(4)}, Violations: ${metrics.violations.length}`);
  }

  // 3. Calculate summary statistics
  const meanRecallAt5 = results.reduce((sum, r) => sum + r.metrics.recallAt5, 0) / results.length;
  const meanPrecisionAt5 = results.reduce((sum, r) => sum + r.metrics.precisionAt5, 0) / results.length;
  const meanMRR = results.reduce((sum, r) => sum + r.metrics.mrr, 0) / results.length;
  const meanNDCGAt5 = results.reduce((sum, r) => sum + r.metrics.ndcgAt5, 0) / results.length;

  const evalResults = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalQueries: results.length,
      categories: Array.from(categories),
      meanRecallAt5,
      meanPrecisionAt5,
      meanMRR,
      meanNDCGAt5,
      totalViolations,
      violationsList,
    },
    results,
  };

  // 4. Write eval_results.json
  fs.writeFileSync(EVAL_RESULTS_JSON, JSON.stringify(evalResults, null, 2), 'utf-8');
  console.log(`\n[Evaluate] ✅ eval_results.json written (${fs.statSync(EVAL_RESULTS_JSON).size} bytes)`);

  // 5. Write eval_results.md
  const mdContent = formatResults(evalResults);
  fs.writeFileSync(EVAL_RESULTS_MD, mdContent, 'utf-8');
  console.log(`[Evaluate] ✅ eval_results.md written (${fs.statSync(EVAL_RESULTS_MD).size} bytes)`);

  // 6. Print summary
  console.log('\n' + '='.repeat(80));
  console.log('[Evaluate] Summary:');
  console.log(`  Total queries: ${results.length}`);
  console.log(`  Mean Recall@5: ${meanRecallAt5.toFixed(4)}`);
  console.log(`  Mean Precision@5: ${meanPrecisionAt5.toFixed(4)}`);
  console.log(`  Mean MRR: ${meanMRR.toFixed(4)}`);
  console.log(`  Mean NDCG@5: ${meanNDCGAt5.toFixed(4)}`);
  console.log(`  Total must_not_suggest violations: ${totalViolations}`);
  console.log('='.repeat(80));
  console.log('\n[Evaluate] ✅ SUCCESS');
}

module.exports = { calculateMetrics, formatResults };
