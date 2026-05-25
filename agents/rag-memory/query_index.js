const fs = require('fs');
const path = require('path');
const { tokenize } = require('./tokenizer.js');
const DOMAIN_TERMS = require('./domain_terms.json');

// ========================================
// v1.2.0 Phase A.2 — Improved Scoring
// query_index.js
// 功能：从 index.json 检索 top-k 相关文档
//       使用 keyword + 6 项 boost scoring
// 用法：node agents/rag-memory/query_index.js "Unity WebGL material policy"
// ========================================

const INDEX_PATH = path.join(__dirname, 'index.json');
const K = 5; // top-k (fixed for Phase A)

// ========================================
// Boost 配置
// ========================================
const BOOST = {
  exactPhrase: 0.3,
  filename: 0.2,
  heading: 0.2,
  domainTerms: 0.3,
  recency: 0.2,
  hardConstraints: 0.3,
};

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

/**
 * Boost 1: exact phrase match boost
 * 如果查询中的多词短语出现在文档内容中，给予 boost
 */
function exactPhraseMatchBoost(query, content) {
  if (!content) return 0;
  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // 尝试 2~5 词短语
  const queryTokens = tokenize(query);
  for (let len = Math.min(queryTokens.length, 5); len >= 2; len--) {
    for (let i = 0; i <= queryTokens.length - len; i++) {
      const phrase = queryTokens.slice(i, i + len).join(' ');
      if (lowerContent.includes(phrase)) {
        return BOOST.exactPhrase;
      }
    }
  }
  return 0;
}

/**
 * Boost 2: filename/path match boost
 * 如果查询 token 出现在文件名或路径中，给予 boost
 */
function filenameMatchBoost(queryTokens, filePath) {
  if (!filePath) return 0;
  const lowerPath = filePath.toLowerCase();
  const matchCount = queryTokens.filter(token => lowerPath.includes(token)).length;
  return matchCount > 0 ? BOOST.filename * Math.min(matchCount / queryTokens.length, 1) : 0;
}

/**
 * Boost 3: heading match boost
 * 如果查询 token 出现在 Markdown 标题中，给予 boost
 */
function headingMatchBoost(queryTokens, content) {
  if (!content) return 0;
  const headings = [];
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push(match[1].toLowerCase());
  }

  let matchCount = 0;
  for (const heading of headings) {
    for (const token of queryTokens) {
      if (heading.includes(token)) {
        matchCount++;
        break; // 每个 heading 只计数一次
      }
    }
  }

  return matchCount > 0 ? BOOST.heading * Math.min(matchCount / headings.length, 1) : 0;
}

/**
 * Boost 4: domain_terms synonym boost
 * 如果查询匹配 domain_terms 中的同义词，给予 boost
 */
function domainTermsBoost(queryTokens, docKeywords) {
  if (!docKeywords || docKeywords.length === 0) return 0;

  const domainCategories = Object.keys(DOMAIN_TERMS);
  let matchedCategories = 0;

  for (const category of domainCategories) {
    const synonyms = DOMAIN_TERMS[category];
    const categoryTokens = tokenize(synonyms.join(' '));
    const hasMatch = queryTokens.some(token => categoryTokens.includes(token));
    if (hasMatch) {
      // 检查文档 keyword 是否也匹配该类别
      const docHasMatch = docKeywords.some(kw => categoryTokens.includes(kw));
      if (docHasMatch) {
        matchedCategories++;
      }
    }
  }

  return matchedCategories > 0 ? BOOST.domainTerms * Math.min(matchedCategories / domainCategories.length, 1) : 0;
}

/**
 * Boost 5: recency/freshness boost
 * 优先近期 v1.1.4 / v1.2.0 docs
 */
function recencyBoost(filePath, mtime) {
  if (!filePath) return 0;

  // 优先 v1.1.4 / v1.2.0 docs
  const priorityPatterns = ['v1.1.4', 'v1.2.0', 'V1_1_4', 'V1_2_0'];
  const hasPriorityPattern = priorityPatterns.some(p => filePath.includes(p));
  if (hasPriorityPattern) {
    return BOOST.recency;
  }

  // 基于 mtime 的 recency boost（已通过 freshnessScore 处理）
  return 0;
}

/**
 * Boost 6: hard constraints boost
 * 涉及 server.js / protocol / RELEASE_STATE / tag / playerIndex 时，
 * 优先返回 hard constraint docs
 */
function hardConstraintsBoost(queryTokens, filePath, content) {
  const hardConstraintKeywords = ['server.js', 'protocol', 'release_state', 'git', 'tag', 'playerindex'];
  const hasHardConstraintQuery = queryTokens.some(token => hardConstraintKeywords.includes(token));

  if (!hasHardConstraintQuery) return 0;

  // 检查文档是否是 hard constraint doc
  const hardConstraintFiles = ['FIVE_IRON_LAWS', 'HARD_CONSTRAINTS', 'BASELINE', 'RELEASE_STATE'];
  const isHardConstraintDoc = hardConstraintFiles.some(f => filePath.toUpperCase().includes(f));

  return isHardConstraintDoc ? BOOST.hardConstraints : 0;
}

function calculateScore(query, queryTokens, docKeywords, freshness, content, filePath, mtime) {
  // 1. Keyword match score (0..1)
  const matchedTokens = queryTokens.filter(token => docKeywords.includes(token));
  const keywordScore = matchedTokens.length / Math.max(queryTokens.length, 1);

  // 2. Freshness score (0..1, from index metadata)
  const freshnessScore = freshness || 0.5; // default 0.5 if not provided

  // 3. Base score (weighted)
  let finalScore = 0.7 * keywordScore + 0.3 * freshnessScore;

  // 4. Boost 1: exact phrase match
  finalScore += exactPhraseMatchBoost(query, content);

  // 5. Boost 2: filename/path match
  finalScore += filenameMatchBoost(queryTokens, filePath);

  // 6. Boost 3: heading match
  finalScore += headingMatchBoost(queryTokens, content);

  // 7. Boost 4: domain_terms synonym
  finalScore += domainTermsBoost(queryTokens, docKeywords);

  // 8. Boost 5: recency/freshness
  finalScore += recencyBoost(filePath, mtime);

  // 9. Boost 6: hard constraints
  finalScore += hardConstraintsBoost(queryTokens, filePath, content);

  // 10. Cap at 1.0
  finalScore = Math.min(finalScore, 1.0);

  return {
    score: finalScore,
    matchedTokens,
    keywordScore,
    freshnessScore,
  };
}
function queryIndex(query, options = {}) {
  const { k = K, silent = false } = options;
  const index = loadIndex();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    if (!silent) console.warn('[Query Index] ⚠️ Query has no valid tokens after filtering.');
    return [];
  }

  const results = index.files.map(file => {
    const content = fs.readFileSync(file.absolutePath, 'utf-8');
    const { score, matchedTokens, keywordScore, freshnessScore } = calculateScore(
      query,
      queryTokens,
      file.keywords || [],
      getFreshnessScore(file.mtime, index.files),
      content,
      file.path,
      file.mtime
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

/**
 * 改进版 extractSnippet：
 * 1. 优先包含命中的 heading
 * 2. 优先包含 query term 附近上下文
 * 3. 不要只截取文档开头
 */
function extractSnippet(content, matchedTokens, maxLength = 300) {
  if (!content || matchedTokens.length === 0) return '';

  const lines = content.split('\n');
  const headingRegex = /^#{1,6}\s+(.+)$/;

  // 1. 找到所有包含 matchedTokens 的行（记录行号）
  const matchedLineIndices = [];
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    if (matchedTokens.some(token => lowerLine.includes(token))) {
      matchedLineIndices.push(i);
    }
  }

  if (matchedLineIndices.length === 0) {
    // 没有命中 token，返回文档开头（最多 maxLength）
    return lines.slice(0, 5).join(' ').slice(0, maxLength) + (content.length > maxLength ? '...' : '');
  }

  // 2. 为每个命中行收集上下文（heading + 前后各 2 行）
  const snippetLines = new Set();
  for (const idx of matchedLineIndices) {
    // 向上找最近 heading
    let headingIdx = -1;
    for (let j = idx; j >= 0; j--) {
      if (headingRegex.test(lines[j])) {
        headingIdx = j;
        break;
      }
    }
    if (headingIdx >= 0) snippetLines.add(headingIdx);

    // 添加命中行
    snippetLines.add(idx);

    // 添加前后各 2 行
    for (let delta = -2; delta <= 2; delta++) {
      const newIdx = idx + delta;
      if (newIdx >= 0 && newIdx < lines.length && newIdx !== headingIdx) {
        snippetLines.add(newIdx);
      }
    }
  }

  // 3. 按行号排序，拼接
  const sortedIndices = Array.from(snippetLines).sort((a, b) => a - b);
  let snippet = sortedIndices.map(i => lines[i].trim()).join(' ');

  // 4. 截断到 maxLength
  if (snippet.length > maxLength) {
    snippet = snippet.slice(0, maxLength) + '...';
  }

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

module.exports = { queryIndex, calculateScore, tokenize, extractSnippet, loadIndex };
