// ========================================
// v1.2.0 Phase B.4 — Explainable Retrieval
// explain_retrieval.js
// Provides human-readable explanation of why a doc was retrieved
// ========================================

import { tokenize } from './query_index.cjs';

/**
 * Generate explanation for a retrieved document.
 * @param {object} candidate - The candidate object from hybridSearch
 * @param {string} query - Original query
 * @param {object} weights - Weight config used
 * @returns {object} explanation { summary, scoreBreakdown, matchedTerms, reason }
 */
export function explainRetrieval(candidate, query, weights = {}) {
  const parts = [];
  const scoreBreakdown = {};
  const matchedTerms = [];

  // 1. Keyword component
  const kwScore = candidate.keywordScore || 0;
  const kwNorm = candidate.keywordNorm || 0;
  const kwWeight = weights.keyword || 0.40;
  const kwContrib = kwWeight * kwNorm;
  scoreBreakdown.keyword = {
    raw: +kwScore.toFixed(4),
    normalized: +kwNorm.toFixed(4),
    weight: kwWeight,
    contribution: +kwContrib.toFixed(4),
  };
  if (kwNorm > 0.1) {
    parts.push(`keyword(${(kwNorm).toFixed(2)})`);
  }

  // 2. Semantic component
  const semScore = candidate.semanticScore || 0;
  const semNorm = candidate.semanticNorm || 0;
  const semWeight = weights.semantic || 0.30;
  const semContrib = semWeight * semNorm;
  scoreBreakdown.semantic = {
    raw: +semScore.toFixed(4),
    normalized: +semNorm.toFixed(4),
    weight: semWeight,
    contribution: +semContrib.toFixed(4),
  };
  if (semNorm > 0.1) {
    parts.push(`semantic(${(semNorm).toFixed(2)})`);
  }

  // 3. Governance boost
  const govBoost = candidate.governanceBoost || 0;
  scoreBreakdown.governance = { boost: +govBoost.toFixed(4) };
  if (govBoost > 0.05) {
    parts.push(`governance(${(govBoost).toFixed(2)})`);
  }

  // 4. Path boost
  const pathBoost = candidate.pathBoost || 0;
  scoreBreakdown.pathBoost = { boost: +pathBoost.toFixed(4) };
  if (pathBoost > 0.05) {
    parts.push(`path(${(pathBoost).toFixed(2)})`);
  }

  // 5. Heading boost
  const headingBoost = candidate.headingBoost || 0;
  scoreBreakdown.headingBoost = { boost: +headingBoost.toFixed(4) };
  if (headingBoost > 0.05) {
    parts.push(`heading(${(headingBoost).toFixed(2)})`);
  }

  // 6. Hard constraint override
  if (candidate.isHardConstraintDoc) {
    parts.push('HARD_CONSTRAINT');
    scoreBreakdown.hardConstraintOverride = true;
  }

  // 7. Matched keyword terms
  if (candidate.matchedTokens && Array.isArray(candidate.matchedTokens)) {
    matchedTerms.push(...candidate.matchedTokens);
  }
  // Also check snippet for query term overlap
  const queryTokens = tokenize(query);
  const snippet = (candidate.snippet || '').toLowerCase();
  const matchedInSnippet = queryTokens.filter(t => snippet.includes(t.toLowerCase()));
  matchedTerms.push(...matchedInSnippet);

  // Deduplicate
  const uniqueTerms = [...new Set(matchedTerms)];

  // 8. Build reason string
  let reason = '';
  if (uniqueTerms.length > 0) {
    reason = 'matched: ' + uniqueTerms.slice(0, 8).join(', ');
  }
  if (candidate._governanceInjected) {
    reason = (reason ? reason + '; ' : '') + 'GOVERNANCE_ROUTING_ENFORCED';
  }
  if (candidate._blocked) {
    reason = (reason ? reason + '; ' : '') + 'BLOCKED: ' + candidate._blockReason;
  }

  const summary = parts.length > 0 ? 'score: ' + parts.join(' + ') : 'low-score';

  return {
    summary,
    scoreBreakdown,
    matchedTerms: uniqueTerms,
    reason,
    finalScore: candidate.finalScore || 0,
    rank: candidate.rank || 0,
  };
}

/**
 * CLI: explain a single query result
 * Usage: node explain_retrieval.js "query text" [topK]
 */
if (process.argv[1]?.includes('explain_retrieval')) {
  const query = process.argv.slice(2, process.argv.length - 1).join(' ') || process.argv[2] || '';
  const topK = parseInt(process.argv[process.argv.length - 1], 10) || 5;

  if (!query) {
    console.error('Usage: node explain_retrieval.js "query" [topK]');
    process.exit(1);
  }

  // Dynamic import to avoid circular deps
  import('./hybrid_retrieval.js').then(({ hybridSearch }) => {
    hybridSearch(query, { topK }).then(result => {
      console.log(`\n[Explain] Query: "${query}"`);
      console.log(`  Category: ${result.classification?.category || 'unknown'}`);
      console.log(`  Confidence: ${result.classification?.confidence?.toFixed(2) || 'N/A'}`);
      console.log(`  Total candidates: ${result.totalCandidates}, Blocked: ${result.blockedCount}`);
      console.log('='.repeat(80));

      for (const r of result.results) {
        const exp = explainRetrieval(r, query, result.classification?.strategy);
        console.log(`\n[${r.rank}] ${r.path}`);
        console.log(`  Final score: ${exp.finalScore.toFixed(4)}`);
        console.log(`  Summary: ${exp.summary}`);
        console.log(`  Score breakdown:`);
        for (const [k, v] of Object.entries(exp.scoreBreakdown)) {
          console.log(`    ${k}: ${JSON.stringify(v)}`);
        }
        if (exp.matchedTerms.length > 0) {
          console.log(`  Matched terms: ${exp.matchedTerms.join(', ')}`);
        }
        console.log(`  Reason: ${exp.reason}`);
        if (r.snippet) {
          console.log(`  Snippet: ${r.snippet.slice(0, 150)}${r.snippet.length > 150 ? '...' : ''}`);
        }
      }

      if (result.blockedRecords.length > 0) {
        console.log(`\n[Explain] Blocked (${result.blockedRecords.length}):`);
        for (const b of result.blockedRecords) {
          console.log(`  ❌ ${b.path} — ${b.pattern}`);
        }
      }

      console.log('\n[Explain] ✅ DONE\n');
    }).catch(err => {
      console.error('[Explain] ❌ FAILED:', err.message);
      process.exit(1);
    });
  });
}

export default { explainRetrieval };
