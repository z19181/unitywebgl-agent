// =======================================
// v1.2.0 Phase B.2 — Multi-Mode Evaluation (v2)
// evaluate_all_modes_v2.js
// Simplified version - prints to console, no file output
// =======================================

const fs = require('fs');
const path = require('path');

// =======================================
// Config
// =======================================
const TEST_QUERIES_PATH = path.join(__dirname, 'test_queries.json');

// =======================================
// Load test queries
// =======================================
function loadTestQueries() {
  if (!fs.existsSync(TEST_QUERIES_PATH)) {
    console.error('[Evaluate] ❌ test_queries.json not found.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TEST_QUERIES_PATH, 'utf-8'));
}

// =======================================
// Evaluate single mode
// =======================================
async function evaluateMode(mode) {
  const testQueries = loadTestQueries();
  let totalRecallAt5 = 0;
  let totalPrecisionAt5 = 0;
  let totalMRR = 0;
  let totalNDCGAt5 = 0;
  let totalViolations = 0;
  let totalBlocked = 0;
  const results = [];

  for (const q of testQueries.queries) {
    let searchResults = [];
    
    if (mode === 'keyword') {
      const { queryIndex } = require('./query_index.cjs');
      searchResults = queryIndex(q.query, { k: 10, silent: true });
    } else if (mode === 'semantic') {
      const { retrieveWithSnippets } = require('./retrieve_semantic.js');
      const ollama = require('./providers/ollama_provider.js');
      const queryEmbedding = await ollama.embedText(q.query);
      searchResults = retrieveWithSnippets(queryEmbedding, { k: 10, silent: true });
    } else if (mode === 'hybrid') {
      const { hybridSearch } = require('./hybrid_retrieval.js');
      const hr = await hybridSearch(q.query, { topK: 10 });
      searchResults = hr.results;
    }

    // Calculate metrics
    const expectedSet = new Set(q.expected_files);
    const actualPaths = searchResults.map(r => r.path);
    
    // Recall@5
    const top5 = actualPaths.slice(0, 5);
    const relevantInTop5 = top5.filter(p => expectedSet.has(p)).length;
    const recallAt5 = expectedSet.size > 0 ? relevantInTop5 / expectedSet.size : 0;
    
    // Precision@5
    const precisionAt5 = top5.length > 0 ? relevantInTop5 / top5.length : 0;
    
    // MRR
    let mrr = 0;
    for (let i = 0; i < actualPaths.length; i++) {
      if (expectedSet.has(actualPaths[i])) {
        mrr = 1.0 / (i + 1);
        break;
      }
    }
    
    // NDCG@5
    let dcgAt5 = 0;
    let idcgAt5 = 0;
    for (let i = 0; i < Math.min(5, actualPaths.length); i++) {
      const gain = expectedSet.has(actualPaths[i]) ? 1 : 0;
      dcgAt5 += gain / Math.log2(i + 2);
    }
    // IDCG@5 (best case: all 5 are relevant)
    for (let i = 0; i < Math.min(5, expectedSet.size); i++) {
      idcgAt5 += 1 / Math.log2(i + 2);
    }
    const ndcgAt5 = idcgAt5 > 0 ? dcgAt5 / idcgAt5 : 0;
    
    // Violations (must_not_suggest)
    let violations = [];
    if (q.must_not_suggest) {
      for (const banned of q.must_not_suggest) {
        if (top5.includes(banned)) {
          violations.push(banned);
        }
      }
    }
    
    totalRecallAt5 += recallAt5;
    totalPrecisionAt5 += precisionAt5;
    totalMRR += mrr;
    totalNDCGAt5 += ndcgAt5;
    totalViolations += violations.length;
    
    results.push({
      id: q.id,
      query: q.query,
      category: q.category,
      expected_files: q.expected_files,
      must_not_suggest: q.must_not_suggest || [],
      metrics: {
        recallAt5,
        precisionAt5,
        mrr,
        ndcgAt5,
        violations: violations.length > 0 ? violations : [],
      },
      results: searchResults.slice(0, 5).map(r => ({
        path: r.path,
        score: r.score || r.finalScore || 0,
      })),
    });
  }
  
  const n = testQueries.queries.length;
  return {
    mode,
    meanRecallAt5: totalRecallAt5 / n,
    meanPrecisionAt5: totalPrecisionAt5 / n,
    meanMRR: totalMRR / n,
    meanNDCGAt5: totalNDCGAt5 / n,
    totalViolations,
    totalBlocked,
    results,
  };
}

// =======================================
// Format comparison
// =======================================
function formatComparison(allModes) {
  let md = '# RAG Retrieval Evaluation Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  md += '| Mode | Recall@5 | Precision@5 | MRR | NDCG@5 | Violations |\n';
  md += '|------|----------|-------------|-----|--------|------------|\n';
  
  for (const m of allModes) {
    md += `| ${m.mode} | ${m.meanRecallAt5.toFixed(4)} | ${m.meanPrecisionAt5.toFixed(4)} | ${m.meanMRR.toFixed(4)} | ${m.meanNDCGAt5.toFixed(4)} | ${m.totalViolations} |\n`;
  }
  
  md += '\n## Detailed Results\n\n';
  for (const m of allModes) {
    md += `### ${m.mode.toUpperCase()}\n\n`;
    for (const r of m.results) {
      md += `**Q${r.id}: ${r.query}**\n`;
      md += `- Category: ${r.category}\n`;
      md += `- Expected: ${r.expected_files.join(', ')}\n`;
      md += `- Recall@5: ${r.metrics.recallAt5.toFixed(4)}\n`;
      md += `- Violations: ${r.metrics.violations.length > 0 ? r.metrics.violations.join(', ') : '0'}\n`;
      md += '- Top 5:\n';
      for (const res of r.results) {
        md += `  - ${res.path} (score: ${res.score.toFixed(4)})\n`;
      }
      md += '\n';
    }
  }
  
  return md;
}

// =======================================
// Main
// =======================================
async function main() {
  const args = process.argv.slice(2);
  const targetMode = args.find(a => a.startsWith('--mode='));
  const mode = targetMode ? targetMode.split('=')[1] : 'all';
  
  const testQueries = loadTestQueries();
  console.log(`\n[Evaluate] Starting evaluation...`);
  console.log(`  Modes: ${mode === 'all' ? 'keyword, semantic, hybrid' : mode}`);
  console.log(`  Queries: ${testQueries.queries.length}\n`);
  
  const allModes = [];
  
  if (mode === 'all' || mode === 'keyword') {
    console.log('[Evaluate] Running KEYWORD mode...');
    const kw = await evaluateMode('keyword');
    allModes.push(kw);
    console.log(`  Recall@5: ${kw.meanRecallAt5.toFixed(4)}`);
  }
  
  if (mode === 'all' || mode === 'semantic') {
    console.log('[Evaluate] Running SEMANTIC mode...');
    const sem = await evaluateMode('semantic');
    allModes.push(sem);
    console.log(`  Recall@5: ${sem.meanRecallAt5.toFixed(4)}`);
  }
  
  if (mode === 'all' || mode === 'hybrid') {
    console.log('[Evaluate] Running HYBRID mode...');
    const hyb = await evaluateMode('hybrid');
    allModes.push(hyb);
    console.log(`  Recall@5: ${hyb.meanRecallAt5.toFixed(4)}`);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('[Evaluate] FINAL SUMMARY');
  console.log('='.repeat(80));
  for (const m of allModes) {
    console.log(`\n  [${m.mode.toUpperCase()}]`);
    console.log(`    Recall@5:    ${m.meanRecallAt5.toFixed(4)}`);
    console.log(`    Precision@5: ${m.meanPrecisionAt5.toFixed(4)}`);
    console.log(`    MRR:         ${m.meanMRR.toFixed(4)}`);
    console.log(`    NDCG@5:      ${m.meanNDCGAt5.toFixed(4)}`);
    console.log(`    Violations:  ${m.totalViolations}`);
  }
  
  // Write output files
  const outputDir = __dirname;
  
  // JSON
  const jsonPath = path.join(outputDir, 'eval_results_all_modes.json');
  const jsonData = {
    generatedAt: new Date().toISOString(),
    modes: allModes.map(m => ({
      mode: m.mode,
      summary: {
        meanRecallAt5: m.meanRecallAt5,
        meanPrecisionAt5: m.meanPrecisionAt5,
        meanMRR: m.meanMRR,
        meanNDCGAt5: m.meanNDCGAt5,
        totalViolations: m.totalViolations,
        totalBlocked: m.totalBlocked || 0,
      },
      results: m.results.map(r => ({
        id: r.id,
        query: r.query,
        category: r.category,
        expected_files: r.expected_files,
        recallAt5: r.metrics.recallAt5,
        precisionAt5: r.metrics.precisionAt5,
        mrr: r.metrics.mrr,
        ndcgAt5: r.metrics.ndcgAt5,
        violations: r.metrics.violations,
        top5: r.results.slice(0, 5).map(res => ({
          path: res.path,
          score: res.score,
        })),
      })),
    })),
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`\n[Evaluate] ✅ eval_results_all_modes.json written`);
  
  // Markdown
  const mdPath = path.join(outputDir, 'eval_results_all_modes.md');
  const mdContent = formatComparison(allModes);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`[Evaluate] ✅ eval_results_all_modes.md written`);
  
  // Print comparison
  console.log('\n' + '='.repeat(80));
  console.log('[Evaluate] COMPARISON');
  console.log('='.repeat(80));
  
  if (mode === 'all') {
    const kw = allModes.find(m => m.mode === 'keyword');
    const hyb = allModes.find(m => m.mode === 'hybrid');
    if (kw && hyb) {
      console.log(`\n  Hybrid vs Keyword Baseline:`);
      console.log(`    Recall@5: ${hyb.meanRecallAt5.toFixed(4)} vs ${kw.meanRecallAt5.toFixed(4)} ${hyb.meanRecallAt5 > kw.meanRecallAt5 ? '✅' : '❌'}`);
      console.log(`    MRR:      ${hyb.meanMRR.toFixed(4)} vs ${kw.meanMRR.toFixed(4)} ${hyb.meanMRR > kw.meanMRR ? '✅' : '❌'}`);
      console.log(`    Violations: ${hyb.totalViolations} vs ${kw.totalViolations} ${hyb.totalViolations === 0 ? '✅' : '❌'}`);
    }
  }
  
  console.log('\n[Evaluate] ✅ DONE\n');
  process.exit(0);
}

main().catch(err => {
  console.error('[Evaluate] ❌ FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
});
