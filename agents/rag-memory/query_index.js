const fs = require('fs');
const path = require('path');

// ========================================
// v1.2.0 Phase A — RAG Memory Minimal Loop
// query_index.js
// 功能：从 index.json 检索 top-k 相关文档
//       使用 keyword + simple scoring
// 用法：node agents/rag-memory/query_index.js "Unity WebGL material policy"
// ========================================

const INDEX_PATH = path.join(__dirname, 'index.json');
const K = 5; // top-k (fixed for Phase A)

// ========================================
// 工具函数
// ========================================

function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('[Query Index] ❌ Index not found. Run `node build_index.js` first.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf-8'));
}

function tokenize(text) {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after']);
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function calculateScore(queryTokens, docKeywords, freshness) {
  // 1. Keyword match score (0..1)
  const matchedTokens = queryTokens.filter(token => docKeywords.includes(token));
  const keywordScore = matchedTokens.length / Math.max(queryTokens.length, 1);

  // 2. Freshness score (0..1, from index metadata)
  const freshnessScore = freshness || 0.5; // default 0.5 if not provided

  // 3. Final score (weighted)
  const finalScore = 0.7 * keywordScore + 0.3 * freshnessScore;

  return {
    score: finalScore,
    matchedTokens,
    keywordScore,
    freshnessScore,
  };
}

function queryIndex(query, k = K) {
  const index = loadIndex();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    console.warn('[Query Index] ⚠️ Query has no valid tokens after filtering.');
    return [];
  }

  const results = index.files.map(file => {
    const { score, matchedTokens, keywordScore, freshnessScore } = calculateScore(
      queryTokens,
      file.keywords || [],
      getFreshnessScore(file.mtime, index.files)
    );

    return {
      path: file.path,
      absolutePath: file.absolutePath,
      score,
      keywordScore,
      freshnessScore,
      matchedTokens,
      snippet: extractSnippet(fs.readFileSync(file.absolutePath, 'utf-8'), matchedTokens),
      mtime: file.mtime,
      size: file.size,
    };
  });

  // 过滤低分结果 (score < 0.1)
  const filteredResults = results.filter(r => r.score >= 0.1);

  // 按 score 降序排列
  filteredResults.sort((a, b) => b.score - a.score);

  // 返回 top-k
  return filteredResults.slice(0, k);
}

function getFreshnessScore(mtime, allFiles) {
  const mtimes = allFiles.map(f => new Date(f.mtime).getTime());
  const minMtime = Math.min(...mtimes);
  const maxMtime = Math.max(...mtimes);
  const currentMtime = new Date(mtime).getTime();

  if (maxMtime === minMtime) return 0.5; // all files have same mtime
  return (currentMtime - minMtime) / (maxMtime - minMtime);
}

function extractSnippet(content, matchedTokens, maxLength = 150) {
  if (!content || matchedTokens.length === 0) return '';

  const lines = content.split('\n');
  const snippetLines = [];

  for (const line of lines) {
    if (matchedTokens.some(token => line.toLowerCase().includes(token))) {
      snippetLines.push(line.trim());
      if (snippetLines.join(' ').length > maxLength) break;
    }
  }

  let snippet = snippetLines.join(' ').slice(0, maxLength);
  if (snippet.length >= maxLength) snippet += '...';
  return snippet;
}

function formatResults(results, query) {
  if (results.length === 0) {
    return `No relevant documents found for query: "${query}"\n\nSuggestions:\n1. Try different keywords\n2. Check if the document exists in \`docs/\` or \`agents/\`\n3. Run \`node agents/rag-memory/build_index.js\` to rebuild index`;
  }

  const lines = [
    `Found ${results.length} relevant document(s) for query: "${query}"\n`,
    '='.repeat(80),
  ];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    lines.push(`\n[${i + 1}] ${r.path}`);
    lines.push(`    Score: ${r.score.toFixed(4)} (keyword: ${r.keywordScore.toFixed(4)}, freshness: ${r.freshnessScore.toFixed(4)})`);
    lines.push(`    Matched tokens: ${r.matchedTokens.join(', ')}`);
    lines.push(`    Snippet: ${r.snippet}`);
    lines.push(`    Metadata: size=${r.size}B, mtime=${r.mtime}`);
    lines.push('='.repeat(80));
  }

  return lines.join('\n');
}

// ========================================
// Main
// ========================================

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('[Query Index] Usage: node query_index.js "<query>"');
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

module.exports = { queryIndex, calculateScore, tokenize, extractSnippet };
