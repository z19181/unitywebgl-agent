// ========================================
// v1.2.0 Phase B.2 — True Hybrid Retrieval
// hybrid_retrieval.js
// Pipeline: keyword candidates → semantic candidates → union → weighted rerank → safety guard → top_k
// ========================================
import path from 'path';
import { fileURLToPath } from 'url';

// Load query_index.cjs (CommonJS) from ESM
import queryIndexModule from './query_index.cjs';
const { queryIndex, loadIndex, tokenize } = queryIndexModule;
import { retrieveWithSnippets } from './retrieve_semantic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// Config
// ========================================
const HARD_CONSTRAINT_TERMS = [
  'server.js', 'server inject', 'playerIndex', 'player_index',
  'game_message', 'game_message.type', 'protocol', 'release_state',
  'release_state.json', 'five iron laws', 'iron law', 'git tag',
  'tag', 'baseline', 'v0.1.0', '五条铁律', '不可修改', 'hard constraint',
];

const HARD_CONSTRAINT_FILES = [
  'AGENT_RULES.md', 'SOUL.md', 'MEMORY.md', 'BASELINE.md',
  'RELEASE_STATE', 'PROTOCOL', 'FIVE_IRON_LAWS', 'AGENTS.md',
  'HARD_CONSTRAINTS', 'PARTY_GAME_SDK_FINAL_HANDOFF', 'V1_1_4_STATE_SNAPSHOT',
];

const GOVERNANCE_FILES = [
  'RAG_RETRIEVAL_POLICY', 'GOVERNANCE', 'RULES', 'AGENT_RULES',
  'STATE_SNAPSHOT', 'HANDOFF', 'PHASE_', 'REPORT',
];

const MUST_NOT_SUGGEST_PATTERNS = [
  'modify server.js', 'parse game_message.type',
  'controller inject playerIndex', 'drop stash without validation',
  'apply stash to main branch', 'skip release gate',
  'create tag without approval', 'use create-react-app',
  'use Material-UI instead of shadcn', 'use embedding without API key',
  'HDRP materials', 'ShaderGraph', 'ComputeShader',
];

// Score weights (base)
const W = {
  keyword: 0.50,
  semantic: 0.25,
  pathBoost: 0.10,
  headingBoost: 0.05,
  governance: 0.10,
  hardConstraintMin: 0.30,
};

// Query-category-specific weight overrides
const CATEGORY_WEIGHTS = {
  hard_constraints: { keyword: 0.60, semantic: 0.15, governance: 0.20, pathBoost: 0.05, headingBoost: 0.00 },
  release_gate:    { keyword: 0.60, semantic: 0.15, governance: 0.20, pathBoost: 0.05, headingBoost: 0.00 },
  git_governance:  { keyword: 0.55, semantic: 0.20, governance: 0.15, pathBoost: 0.05, headingBoost: 0.05 },
  rag_memory:     { keyword: 0.45, semantic: 0.35, governance: 0.05, pathBoost: 0.10, headingBoost: 0.05 },
  agent_runtime:  { keyword: 0.45, semantic: 0.35, governance: 0.05, pathBoost: 0.10, headingBoost: 0.05 },
  token_cost:     { keyword: 0.45, semantic: 0.35, governance: 0.05, pathBoost: 0.10, headingBoost: 0.05 },
  material_policy: { keyword: 0.50, semantic: 0.25, governance: 0.10, pathBoost: 0.10, headingBoost: 0.05 },
  unity_webgl:    { keyword: 0.50, semantic: 0.25, governance: 0.10, pathBoost: 0.10, headingBoost: 0.05 },
  canary_pipeline:{ keyword: 0.50, semantic: 0.25, governance: 0.10, pathBoost: 0.10, headingBoost: 0.05 },
  dashboard:      { keyword: 0.50, semantic: 0.25, governance: 0.10, pathBoost: 0.10, headingBoost: 0.05 },
};

// File-like terms that boost path scoring
const FILE_LIKE_TERMS = [/\.md\b/i, /\.yml\b/i, /\.yaml\b/i, /\.js\b/i, /\.prompt\b/i,
  /docker/i, /prometheus/i, /grafana/i, /baseline/i];

function getWeights(query, queryCategory) {
  const w = { ...W };

  // Apply category-specific overrides if known
  if (queryCategory && CATEGORY_WEIGHTS[queryCategory]) {
    Object.assign(w, CATEGORY_WEIGHTS[queryCategory]);
  }

  // If query contains file-like terms, boost path scoring
  const hasFileTerms = FILE_LIKE_TERMS.some(re => re.test(query));
  if (hasFileTerms) {
    w.pathBoost = Math.max(w.pathBoost, 0.20);
  }

  return w;
}

// ========================================
// Safety Guard
// ========================================
function safetyGuard(candidate) {
  const snippet = (candidate.snippet || '').toLowerCase();
  for (const pattern of MUST_NOT_SUGGEST_PATTERNS) {
    if (snippet.includes(pattern.toLowerCase())) {
      return { blocked: true, pattern, reason: `must_not_suggest pattern "${pattern}" found in snippet` };
    }
  }
  return { blocked: false };
}

// ========================================
// Keyword retrieval (top-N candidates)
// ========================================
async function keywordSearchCandidates(query, topN = 20) {
  const results = queryIndex(query, { k: topN, silent: true });
  return results.map(r => ({
    path: r.path,
    absolutePath: r.absolutePath,
    keywordScore: r.keywordScore,
    score: r.score,
    snippet: r.snippet,
    mtime: r.mtime,
    size: r.size,
    matchedTokens: r.matchedTokens,
    pathBoost: calcPathBoost(r.path, query),
    headingBoost: calcHeadingBoost(r.snippet, query),
  }));
}

// ========================================
// Semantic retrieval (top-N candidates)
// ========================================
async function semanticSearchCandidates(query, topN = 20) {
  const rawResults = await retrieveWithSnippets(query, { topK: topN });
  return rawResults.map(r => ({
    path: r.documentPath,
    absolutePath: path.join(__dirname, '..', '..', r.documentPath),
    semanticScore: r.bestSimilarity,
    score: r.bestSimilarity,
    snippet: r.snippets[0]?.content || '',
    rawSimilarity: r.rawSimilarity,
    sectionTitle: r.snippets[0]?.sectionTitle || '',
    charCount: r.snippets[0]?.charCount || 0,
    pathBoost: 0,
    headingBoost: 0,
  }));
}

// ========================================
// Score components
// ========================================
function calcPathBoost(filePath, query) {
  if (!filePath) return 0;
  const lowerPath = filePath.toLowerCase();
  const tokens = tokenize(query);
  const matched = tokens.filter(t => lowerPath.includes(t.toLowerCase())).length;
  let boost = matched > 0 ? Math.min(matched / Math.max(tokens.length, 1), 1) : 0;

  // Prompt file bonus: boost when query mentions prompt-related terms
  if (lowerPath.includes('prompts/') && /prompt|template|review|codex|task|release|rag/i.test(query)) {
    boost = Math.max(boost, 0.6);
  }

  // Docker path bonus
  if (lowerPath.includes('docker/') && /prometheus|grafana|docker|metrics|dashboard/i.test(query)) {
    boost = Math.max(boost, 0.5);
  }

  return boost;
}

function calcHeadingBoost(snippet, query) {
  if (!snippet) return 0;
  const hasHeading = /^#{1,6}\s+/m.test(snippet);
  const tokens = tokenize(query);
  const snippetLower = snippet.toLowerCase();
  const headingTokens = tokens.filter(t => snippetLower.includes(t.toLowerCase()));
  if (hasHeading && headingTokens.length > 0) return 0.5;
  return 0;
}

function isHardConstraintQuery(query) {
  const lower = query.toLowerCase();
  return HARD_CONSTRAINT_TERMS.some(term => lower.includes(term.toLowerCase()));
}

function isHardConstraintDoc(filePath) {
  if (!filePath) return false;
  const upper = filePath.toUpperCase();
  return HARD_CONSTRAINT_FILES.some(f => upper.includes(f.toUpperCase()));
}

function isGovernanceDoc(filePath) {
  if (!filePath) return false;
  const upper = filePath.toUpperCase();
  return GOVERNANCE_FILES.some(f => upper.includes(f.toUpperCase()));
}

function calcGovernanceBoost(query, filePath) {
  const isHCQuery = isHardConstraintQuery(query);
  const isHCDoc = isHardConstraintDoc(filePath);
  const isGovDoc = isGovernanceDoc(filePath);

  if (isHCQuery && isHCDoc) return Math.max(W.governance, W.hardConstraintMin);
  if (isHCQuery && isGovDoc) return W.governance * 0.8;
  if (isGovDoc) return W.governance * 0.5;
  return 0;
}

// ========================================
// Normalize scores to [0, 1] using percentile rank
// ========================================
function normalizeScores(candidates, scoreKey) {
  if (candidates.length === 0) return candidates;
  const scores = candidates.map(c => c[scoreKey] || 0);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  if (max === min) {
    return candidates.map(c => ({ ...c, [`${scoreKey}_norm`]: 0.5 }));
  }
  return candidates.map(c => ({
    ...c,
    [`${scoreKey}_norm`]: ((c[scoreKey] || 0) - min) / (max - min),
  }));
}

// ========================================
// Hybrid retrieval
// ========================================
async function hybridSearch(query, { topK = 5, queryCategory } = {}) {
  const isHCQuery = isHardConstraintQuery(query);
  const w = getWeights(query, queryCategory);

  // A. Keyword candidates (top 20)
  const kwCandidates = await keywordSearchCandidates(query, 20);

  // B. Semantic candidates (top 20)
  const semCandidates = await semanticSearchCandidates(query, 20);

  // C. Union all candidates (dedup by path)
  const docMap = new Map();
  for (const c of kwCandidates) {
    if (!docMap.has(c.path)) docMap.set(c.path, { ...c });
    else {
      const existing = docMap.get(c.path);
      if ((c.keywordScore || 0) > (existing.keywordScore || 0)) {
        docMap.set(c.path, { ...existing, ...c });
      }
    }
  }
  for (const c of semCandidates) {
    if (!docMap.has(c.path)) docMap.set(c.path, { ...c });
    else {
      const existing = docMap.get(c.path);
      if ((c.semanticScore || 0) > (existing.semanticScore || 0)) {
        c.keywordScore = existing.keywordScore;
        c.score = existing.score;
        c.pathBoost = existing.pathBoost;
        c.headingBoost = existing.headingBoost;
        docMap.set(c.path, c);
      } else {
        // ensure semantic score exists
        existing.semanticScore = c.semanticScore;
        existing.rawSimilarity = c.rawSimilarity;
        existing.snippet = c.snippet;
        existing.sectionTitle = c.sectionTitle;
        existing.charCount = c.charCount;
        docMap.set(c.path, existing);
      }
    }
  }

  let candidates = Array.from(docMap.values());

  // Safety guard
  const blockedRecords = [];
  candidates = candidates.filter(c => {
    const guard = safetyGuard(c);
    if (guard.blocked) {
      c._blocked = true;
      c._blockReason = guard.reason;
      blockedRecords.push({ path: c.path, pattern: guard.pattern });
    }
    return !guard.blocked;
  });

  // D. Normalize keyword and semantic scores
  candidates = normalizeScores(candidates, 'keywordScore');
  candidates = normalizeScores(candidates, 'semanticScore');

  // E. Compute final weighted score
  for (const c of candidates) {
    const kwNorm = c.keywordScore_norm ?? 0;
    const semNorm = c.semanticScore_norm ?? 0;
    const pb = c.pathBoost ?? 0;
    const hb = c.headingBoost ?? 0;
    const gov = calcGovernanceBoost(query, c.path);

    let final = w.keyword * kwNorm + w.semantic * semNorm + w.pathBoost * pb + w.headingBoost * hb + gov;

    // Hard constraint override: HC docs must appear in top 5
    if (isHCQuery && isHardConstraintDoc(c.path)) {
      final = Math.max(final, w.hardConstraintMin + calcGovernanceBoost(query, c.path));
    }

    c.finalScore = Math.min(final, 1.0);
    c.keywordNorm = kwNorm;
    c.semanticNorm = semNorm;
    c.governanceBoost = gov;
    c.isHardConstraintQuery = isHCQuery;
    c.isHardConstraintDoc = isHardConstraintDoc(c.path);
  }

  // F. Sort by final score
  candidates.sort((a, b) => b.finalScore - a.finalScore);

  // G. Return top-k with reasoning
  const topResults = candidates.slice(0, topK).map((c, idx) => ({
    rank: idx + 1,
    path: c.path,
    finalScore: c.finalScore,
    keywordScore: c.keywordScore || 0,
    keywordNorm: c.keywordNorm || 0,
    semanticScore: c.semanticScore || 0,
    semanticNorm: c.semanticNorm || 0,
    pathBoost: c.pathBoost || 0,
    headingBoost: c.headingBoost || 0,
    governanceBoost: c.governanceBoost || 0,
    snippet: (c.snippet || '').slice(0, 200),
    isHardConstraintDoc: c.isHardConstraintDoc || false,
    reason: buildReason(c),
  }));

  return {
    query,
    isHardConstraintQuery: isHCQuery,
    totalCandidates: candidates.length + blockedRecords.length,
    blockedCount: blockedRecords.length,
    topK,
    results: topResults,
    blockedRecords,
  };
}

// ========================================
// Reason string
// ========================================
function buildReason(c) {
  const parts = [];
  if (c.keywordNorm > 0.5) parts.push(`keyword:${c.keywordNorm.toFixed(2)}`);
  if (c.semanticNorm > 0.5) parts.push(`semantic:${c.semanticNorm.toFixed(2)}`);
  if (c.pathBoost > 0) parts.push(`path:${c.pathBoost.toFixed(2)}`);
  if (c.headingBoost > 0) parts.push(`heading:${c.headingBoost.toFixed(2)}`);
  if (c.governanceBoost > 0.1) parts.push(`governance:${c.governanceBoost.toFixed(2)}`);
  if (c.isHardConstraintDoc) parts.push('HARD_CONSTRAINT');
  return parts.join(' + ') || 'low-score';
}

// ========================================
// CLI
// ========================================
if (process.argv[1]?.includes('hybrid_retrieval')) {
  const query = process.argv[2] || 'hard constraints server.js';
  const topK = parseInt(process.argv[3] || '5', 10);

  console.log(`\n[Hybrid] Query: "${query}" (topK=${topK})\n`);

  hybridSearch(query, { topK }).then(result => {
    console.log(`[Hybrid] Total candidates: ${result.totalCandidates}, blocked: ${result.blockedCount}`);
    console.log(`[Hybrid] Hard constraint query: ${result.isHardConstraintQuery ? 'YES ⚠️' : 'no'}\n`);
    console.log('='.repeat(80));

    for (const r of result.results) {
      console.log(`\n[${r.rank}] ${r.path}`);
      console.log(`    Final score: ${r.finalScore.toFixed(4)}`);
      console.log(`    (kw:${r.keywordScore.toFixed(4)}/norm:${r.keywordNorm.toFixed(2)}, sem:${r.semanticScore.toFixed(4)}/norm:${r.semanticNorm.toFixed(2)}, gov:${r.governanceBoost.toFixed(2)}, path:${r.pathBoost.toFixed(2)}, heading:${r.headingBoost.toFixed(2)})`);
      console.log(`    Reason: ${r.reason}`);
      if (r.isHardConstraintDoc) console.log(`    🛡️ HARD_CONSTRAINT_DOC`);
      console.log(`    Snippet: ${r.snippet}${(r.snippet || '').length > 150 ? '...' : ''}`);
    }

    if (result.blockedRecords.length > 0) {
      console.log(`\n[Hybrid] Blocked (${result.blockedRecords.length}):`);
      for (const b of result.blockedRecords) {
        console.log(`  ❌ ${b.path} — pattern: "${b.pattern}"`);
      }
    }

    console.log('\n[Hybrid] ✅ DONE\n');
  }).catch(err => {
    console.error('[Hybrid] ❌ FAILED:', err.message);
    process.exit(1);
  });
}

export { hybridSearch, keywordSearchCandidates, semanticSearchCandidates, safetyGuard, isHardConstraintQuery, isHardConstraintDoc, isGovernanceDoc };