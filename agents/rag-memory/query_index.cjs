// ========================================
// v1.2.0 Phase B.2 — CJS copy of query_index.js
// All logic identical, but uses module.exports (CommonJS)
// This file is imported from ESM hybrid_retrieval.js via require()
// ========================================
const fs = require('fs');
const path = require('path');

const DOMAIN_TERMS = require('./domain_terms.json');

// ========================================
// Boost Config
// ========================================
const BOOST = {
  exactPhrase: 0.3,
  filename: 0.2,
  heading: 0.2,
  domainTerms: 0.3,
  recency: 0.2,
  hardConstraints: 0.3,
};

const INDEX_PATH = __dirname;
const K = 5;

// ========================================
// Tokenizer
// ========================================
const STOP_WORDS = new Set(['the','a','an','is','are','was','were','to','of','in','for','on','with','and','or','not','be','as','at','by','it','this','that','i','you','we','they','how','what','which','who','when','where','why','can','do','does','did','will','would','should','could','may','might','have','has','had','my','your','our','their','its','about','from','up','out','just','so','if','then','than','also','but','or','nor','yet','for','with','at','from','into','during','including','until','against','among','through','despite','of','to','in','on','off','over','under','again','further','then','once','here','there','when','where','why','how','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now']);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

// ========================================
// Load index
// ========================================
function loadIndex() {
  const idxPath = path.join(__dirname, 'index.json');
  if (!fs.existsSync(idxPath)) {
    throw new Error('[Query Index] index.json not found. Run `node build_index.js` first.');
  }
  return JSON.parse(fs.readFileSync(idxPath, 'utf-8'));
}

// ========================================
// Boost functions
// ========================================
function exactPhraseMatchBoost(query, content) {
  if (!content) return 0;
  const lowerContent = content.toLowerCase();
  const queryTokens = tokenize(query);
  for (let len = Math.min(queryTokens.length, 5); len >= 2; len--) {
    for (let i = 0; i <= queryTokens.length - len; i++) {
      const phrase = queryTokens.slice(i, i + len).join(' ');
      if (lowerContent.includes(phrase)) return BOOST.exactPhrase;
    }
  }
  return 0;
}

function filenameMatchBoost(queryTokens, filePath) {
  if (!filePath) return 0;
  const lowerPath = filePath.toLowerCase();
  const matchCount = queryTokens.filter(token => lowerPath.includes(token)).length;
  return matchCount > 0 ? BOOST.filename * Math.min(matchCount / Math.max(queryTokens.length, 1), 1) : 0;
}

function headingMatchBoost(queryTokens, content) {
  if (!content) return 0;
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(match[1].toLowerCase());
  }
  let matchCount = 0;
  for (const heading of headings) {
    for (const token of queryTokens) {
      if (heading.includes(token)) { matchCount++; break; }
    }
  }
  return matchCount > 0 ? BOOST.heading * Math.min(matchCount / Math.max(headings.length, 1), 1) : 0;
}

function domainTermsBoost(queryTokens, docKeywords) {
  if (!docKeywords || docKeywords.length === 0) return 0;
  const domainCategories = Object.keys(DOMAIN_TERMS);
  let matchedCategories = 0;
  for (const category of domainCategories) {
    const synonyms = DOMAIN_TERMS[category];
    const categoryTokens = tokenize(synonyms.join(' '));
    const hasQueryMatch = queryTokens.some(token => categoryTokens.includes(token));
    if (hasQueryMatch) {
      const docHasMatch = docKeywords.some(kw => categoryTokens.includes(kw));
      if (docHasMatch) matchedCategories++;
    }
  }
  return matchedCategories > 0 ? BOOST.domainTerms * Math.min(matchedCategories / Math.max(domainCategories.length, 1), 1) : 0;
}

function recencyBoost(filePath) {
  if (!filePath) return 0;
  const priorityPatterns = ['v1.1.4', 'v1.2.0', 'V1_1_4', 'V1_2_0'];
  return priorityPatterns.some(p => filePath.includes(p)) ? BOOST.recency : 0;
}

function hardConstraintsBoost(queryTokens, filePath) {
  const hardConstraintKeywords = ['server.js', 'protocol', 'release_state', 'git', 'tag', 'playerindex'];
  const hasHardConstraintQuery = queryTokens.some(token => hardConstraintKeywords.includes(token));
  if (!hasHardConstraintQuery) return 0;
  const hardConstraintFiles = ['FIVE_IRON_LAWS', 'HARD_CONSTRAINTS', 'BASELINE', 'RELEASE_STATE'];
  return hardConstraintFiles.some(f => filePath.toUpperCase().includes(f)) ? BOOST.hardConstraints : 0;
}

function getFreshnessScore(mtime, allFiles) {
  const mtimes = allFiles.map(f => new Date(f.mtime).getTime());
  const minMtime = Math.min(...mtimes);
  const maxMtime = Math.max(...mtimes);
  const currentMtime = new Date(mtime).getTime();
  if (maxMtime === minMtime) return 0.5;
  return (currentMtime - minMtime) / (maxMtime - minMtime);
}

function extractSnippet(content, matchedTokens, maxLength = 300) {
  if (!content || matchedTokens.length === 0) {
    const lines = content ? content.split('\n') : [];
    return lines.slice(0, 5).join(' ').slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  const lines = content.split('\n');
  const headingRegex = /^#{1,6}\s+(.+)$/;
  const matchedLineIndices = [];
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (matchedTokens.some(token => lowerLine.includes(token))) {
      matchedLineIndices.push(i);
    }
  }
  if (matchedLineIndices.length === 0) {
    return lines.slice(0, 5).join(' ').slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  const snippetLines = new Set();
  for (const idx of matchedLineIndices) {
    let headingIdx = -1;
    for (let j = idx; j >= 0; j--) {
      if (headingRegex.test(lines[j])) { headingIdx = j; break; }
    }
    if (headingIdx >= 0) snippetLines.add(headingIdx);
    snippetLines.add(idx);
    for (let delta = -2; delta <= 2; delta++) {
      const newIdx = idx + delta;
      if (newIdx >= 0 && newIdx < lines.length && newIdx !== headingIdx) {
        snippetLines.add(newIdx);
      }
    }
  }
  const sortedIndices = Array.from(snippetLines).sort((a, b) => a - b);
  let snippet = sortedIndices.map(i => lines[i].trim()).join(' ');
  if (snippet.length > maxLength) snippet = snippet.slice(0, maxLength) + '...';
  return snippet;
}

// ========================================
// Calculate score
// ========================================
function calculateScore(query, queryTokens, docKeywords, freshness, content, filePath, mtime, allFiles) {
  const matchedTokens = queryTokens.filter(token => docKeywords.includes(token));
  const keywordScore = matchedTokens.length / Math.max(queryTokens.length, 1);
  const freshnessScore = freshness || 0.5;
  let finalScore = 0.7 * keywordScore + 0.3 * freshnessScore;
  finalScore += exactPhraseMatchBoost(query, content);
  finalScore += filenameMatchBoost(queryTokens, filePath);
  finalScore += headingMatchBoost(queryTokens, content);
  finalScore += domainTermsBoost(queryTokens, docKeywords);
  finalScore += recencyBoost(filePath);
  finalScore += hardConstraintsBoost(queryTokens, filePath);
  return {
    score: Math.min(finalScore, 1.0),
    matchedTokens,
    keywordScore,
    freshnessScore,
  };
}

// ========================================
// Query index
// ========================================
function queryIndex(query, options = {}) {
  const { k = K, silent = false } = options;
  let index;
  try {
    index = loadIndex();
  } catch (err) {
    if (!silent) console.error('[Query Index] ❌', err.message);
    return [];
  }
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    if (!silent) console.warn('[Query Index] ⚠️ Query has no valid tokens after filtering.');
    return [];
  }

  const results = index.files.map(file => {
    let content = '';
    try { content = fs.readFileSync(file.absolutePath, 'utf-8'); } catch (e) { /* skip */ }
    const freshness = getFreshnessScore(file.mtime, index.files);
    const { score, matchedTokens, keywordScore, freshnessScore } = calculateScore(
      query, queryTokens, file.keywords || [], freshness, content, file.path, file.mtime, index.files
    );
    return {
      path: file.path,
      absolutePath: file.absolutePath,
      score,
      keywordScore,
      freshnessScore,
      matchedTokens,
      snippet: extractSnippet(content, matchedTokens),
      mtime: file.mtime,
      size: file.size,
    };
  });

  const filteredResults = results.filter(r => r.score >= 0.1);
  filteredResults.sort((a, b) => b.score - a.score);
  return filteredResults.slice(0, k);
}

function formatResults(results, query) {
  if (results.length === 0) {
    return `No relevant documents found for query: "${query}"`;
  }
  const lines = [`Found ${results.length} relevant document(s) for query: "${query}"`, '='.repeat(80)];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    lines.push(`\n[${i + 1}] ${r.path}`);
    lines.push(`    Score: ${r.score.toFixed(4)} (keyword: ${r.keywordScore.toFixed(4)}, freshness: ${r.freshnessScore.toFixed(4)})`);
    lines.push(`    Matched tokens: ${r.matchedTokens.join(', ')}`);
    lines.push(`    Snippet: ${r.snippet}`);
  }
  return lines.join('\n');
}

// ========================================
// CLI
// ========================================
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('[Query Index] Usage: node query_index.cjs "<query>"');
    process.exit(1);
  }
  const query = args.join(' ');
  console.log(`[Query Index] Query: "${query}"\n`);
  try {
    const results = queryIndex(query);
    console.log(formatResults(results, query));
    console.log(`\n[Query Index] ✅ SUCCESS (${results.length} result(s))`);
  } catch (err) {
    console.error('[Query Index] ❌ FAILED:', err.message);
    process.exit(1);
  }
}

module.exports = { queryIndex, calculateScore, tokenize, extractSnippet, loadIndex };