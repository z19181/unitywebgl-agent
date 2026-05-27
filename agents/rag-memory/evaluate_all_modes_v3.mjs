// =======================================
// v1.2.0 Phase B.3 — Multi-Mode Evaluation (v4)
// evaluate_all_modes_v3.mjs
// ES module, uses import + path normalization + queryCategory
// =======================================

import fs from 'fs';
import path from 'path';
import { hybridSearch } from './hybrid_retrieval.js';
import { normalizePath, findBestPathMatch } from './path_normalizer.js';

// =======================================
// Config
// =======================================
const TEST_QUERIES_PATH = path.join(path.dirname(new URL(import.meta.url).pathname), 'test_queries.json');
const OUTPUT_DIR = path.dirname(new URL(import.meta.url).pathname);

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
// Check if a retrieved result matches any expected file
// Uses path normalization + best-match scoring
// =======================================
function checkRecall(expectedFiles, top5Paths) {
  const normExpected = expectedFiles.map(e => normalizePath(e).normalized);
  let relevantCount = 0;

  for (const rp of top5Paths) {
    const normRp = normalizePath(rp).normalized;
    for (const ne of normExpected) {
      if (normRp === ne) {
        relevantCount++;
        break;
      }
    }
  }

  return relevantCount;
}

// =======================================
// Evaluate single mode
// =======================================
async function evaluateMode(mode, queryIndexModule, retrieveModule, ollamaModule) {
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
      searchResults = queryIndexModule.queryIndex(q.query, { k: 10, silent: true });
    } else if (mode === 'semantic') {
      const embeddings = await ollamaModule.embedText(q.query);
      const embedding = embeddings[0];
      const raw = await retrieveModule.retrieveWithSnippets(embedding, { topK: 10 });
      searchResults = raw.map(r => ({ path: r.documentPath, score: r.bestSimilarity }));
    } else if (mode === 'hybrid') {
      const hr = await hybridSearch(q.query, { topK: 10, queryCategory: q.category });
      searchResults = hr.results;
      totalBlocked += hr.blockedCount || 0;
    }

    // Get actual paths
    const actualPaths = searchResults.map(r => (r.path || r.documentPath || '').trim());
    const top5Paths = actualPaths.slice(0, 5);

    // Recall@5 — using normalized paths
    const relevantInTop5 = checkRecall(q.expected_files, top5Paths);
    const recallAt5 = q.expected_files.length > 0 ? relevantInTop5 / q.expected_files.length : 0;

    // Precision@5
    const precisionAt5 = top5Paths.length > 0 ? relevantInTop5 / top5Paths.length : 0;

    // MRR — normalized match
    let mrr = 0;
    const normExpected = q.expected_files.map(e => normalizePath(e).normalized);
    for (let i = 0; i < actualPaths.length; i++) {
      const normAct = normalizePath(actualPaths[i]).normalized;
      if (normExpected.some(ne => ne === normAct)) {
        mrr = 1.0 / (i + 1);
        break;
      }
    }

    // NDCG@5
    let dcgAt5 = 0;
    let idcgAt5 = 0;
    for (let i = 0; i < Math.min(5, top5Paths.length); i++) {
      const normP = normalizePath(top5Paths[i]).normalized;
      const gain = normExpected.some(ne => ne === normP) ? 1 : 0;
      dcgAt5 += gain / Math.log2(i + 2);
    }
    for (let i = 0; i < Math.min(5, q.expected_files.length); i++) {
      idcgAt5 += 1 / Math.log2(i + 2);
    }
    const ndcgAt5 = idcgAt5 > 0 ? dcgAt5 / idcgAt5 : 0;

    // Violations
    let violations = [];
    if (q.must_not_suggest) {
      for (const banned of q.must_not_suggest) {
        for (const r of searchResults.slice(0, 5)) {
          const snippet = ((r.snippet || '') + ' ' + (r.path || '')).toLowerCase();
          if (snippet.includes(banned.toLowerCase())) {
            violations.push(banned);
            break;
          }
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
      recallAt5,
      precisionAt5,
      mrr,
      ndcgAt5,
      violations: violations.length > 0 ? violations : [],
      top5: top5Paths.map((p, idx) => ({
        path: p,
        score: searchResults[idx]?.score || searchResults[idx]?.finalScore || 0,
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

  md += '\n## Per-Query Details\n\n';
  for (const m of allModes) {
    md += `### ${m.mode.toUpperCase()}\n\n`;
    for (const r of m.results) {
      const status = r.recallAt5 > 0 ? '✅' : (r.recallAt5 === 0 ? '❌' : '⚠️');
      md += `**[${status}] ${r.id}: ${r.query}** (R@5=${r.recallAt5.toFixed(2)}, MRR=${r.mrr.toFixed(4)})\n`;
      md += `- Expected: ${r.expected_files.join(', ')}\n`;
      md += `- Violations: ${r.violations.length > 0 ? r.violations.join(', ') : '0'}\n`;
      md += '- Top 5:\n';
      for (const res of r.top5) {
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

  // Dynamic imports
  const queryIndexModule = await import('./query_index.cjs');
  const retrieveModule = await import('./retrieve_semantic.js');
  const ollamaModule = await import('./providers/ollama_provider.js');

  if (mode === 'all' || mode === 'keyword') {
    console.log('[Evaluate] Running KEYWORD mode...');
    const kw = await evaluateMode('keyword', queryIndexModule, retrieveModule, ollamaModule);
    allModes.push(kw);
    console.log(`  Recall@5: ${kw.meanRecallAt5.toFixed(4)}`);
  }

  if (mode === 'all' || mode === 'semantic') {
    console.log('[Evaluate] Running SEMANTIC mode...');
    const sem = await evaluateMode('semantic', queryIndexModule, retrieveModule, ollamaModule);
    allModes.push(sem);
    console.log(`  Recall@5: ${sem.meanRecallAt5.toFixed(4)}`);
  }

  if (mode === 'all' || mode === 'hybrid') {
    console.log('[Evaluate] Running HYBRID mode...');
    const hyb = await evaluateMode('hybrid', queryIndexModule, retrieveModule, ollamaModule);
    allModes.push(hyb);
    console.log(`  Recall@5: ${hyb.meanRecallAt5.toFixed(4)}`);
  }

  // Write output files
  const outputDir = OUTPUT_DIR;

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
        recallAt5: r.recallAt5,
        precisionAt5: r.precisionAt5,
        mrr: r.mrr,
        ndcgAt5: r.ndcgAt5,
        violations: r.violations,
        top5: r.top5,
      })),
    })),
  };

  const jsonPath = path.join(outputDir, 'eval_results_all_modes.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`\n[Evaluate] ✅ eval_results_all_modes.json written (${fs.statSync(jsonPath).size} bytes)`);

  const mdPath = path.join(outputDir, 'eval_results_all_modes.md');
  const mdContent = formatComparison(allModes);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`[Evaluate] ✅ eval_results_all_modes.md written (${fs.statSync(mdPath).size} bytes)`);

  // Print summary table
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

  if (mode === 'all') {
    const kw = allModes.find(m => m.mode === 'keyword');
    const hyb = allModes.find(m => m.mode === 'hybrid');
    if (kw && hyb) {
      console.log('\n  [HYBRID vs KEYWORD BASELINE]');
      console.log(`    Recall@5: ${hyb.meanRecallAt5.toFixed(4)} vs ${kw.meanRecallAt5.toFixed(4)} ${hyb.meanRecallAt5 >= kw.meanRecallAt5 ? '✅' : '❌'}`);
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
