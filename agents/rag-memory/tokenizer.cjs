// ========================================
// v1.2.0 Phase A.2 — Improved Tokenizer
// tokenizer.js
// Shared by build_index.js and query_index.js
// ========================================

const IMPORTANT_SHORT_WORDS = new Set([
  'hard', 'constraints', 'five', 'iron', 'gate',
  'rag', 'qa', 'ci', 'api', 'tag', 'git', 'wss', 'ssl', 'ws',
  'playerindex', 'player', 'index',  // camelCase 拆分后
  'game', 'message',                // snake_case 拆分后
  'check', 'unity', 'webgl', 'build',  // kebab-case 拆分后
  'server', 'js',                   // dot 拆分后
  'release', 'state',               // UPPER_SNAKE_CASE 拆分后
]);

// 停用词（已移除工程术语：api, git, tag, rag, qa, ci, ws, wss, ssl）
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
  'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'over', 'after',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'get', 'got', 'getting',
  'go', 'went', 'going', 'come', 'came', 'coming', 'make', 'made', 'making',
  'take', 'took', 'taking', 'see', 'saw', 'seen', 'seeing', 'look', 'looked',
  'looking', 'find', 'found', 'finding', 'give', 'gave', 'given', 'giving',
  'think', 'thought', 'thinking', 'know', 'knew', 'known', 'knowing',
  'come', 'came', 'coming', 'become', 'became', 'becoming',
]);

/**
 * 改进版 tokenize：
 * 1. 拆分 camelCase（playerIndex → player index）
 * 2. 拆分 snake_case（game_message → game message）
 * 3. 拆分 kebab-case（check-unity-webgl-build → check unity webgl build）
 * 4. 处理 dot（server.js → server js）
 * 5. 大小写归一（WebGL → webgl, QClaw → qclaw）
 * 6. 保留工程关键短词（qa, ci, ws, rag, api, tag, git, wss, ssl）
 * 7. 过滤停用词、纯数字、过短词（<2 chars，关键短词除外）
 */
function tokenize(text) {
  // 1. 拆分 camelCase（仅当大写字母后跟小写字母时插入空格，排除 acronym）
  let normalized = text.replace(/([a-z])([A-Z])([a-z])/g, '$1 $2$3');

  // 2. 拆分 snake_case 和 kebab-case（替换 _ 和 - 为空格）
  normalized = normalized.replace(/[_-]/g, ' ');

  // 3. 处理 dot（替换 . 为空格）
  normalized = normalized.replace(/\./g, ' ');

  // 4. 大小写归一
  normalized = normalized.toLowerCase();

  // 5. 按空白字符拆分
  const tokens = normalized.split(/\s+/).filter(word => word.length > 0);

  // 6. 过滤 tokens
  const filtered = tokens.filter(word => {
    // 保留工程关键短词
    if (IMPORTANT_SHORT_WORDS.has(word)) return true;

    // 过滤停用词
    if (STOP_WORDS.has(word)) return false;

    // 过滤纯数字
    if (/^\d+$/.test(word)) return false;

    // 过滤过短词（length < 2）
    if (word.length < 2) return false;

    return true;
  });

  return filtered;
}

/**
 * 改进版 extractKeywords：
 * 1. 使用改进版 tokenize
 * 2. 按频率排序（最高频在前）
 * 3. 返回 top-100 keywords
 */
function extractKeywords(content) {
  // 1. Tokenize
  const tokens = tokenize(content);

  // 2. 计数频率
  const freq = {};
  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }

  // 3. 按频率排序（降序）
  const sorted = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => word);

  // 4. 返回 top-100
  return sorted.slice(0, 100);
}

module.exports = { tokenize, extractKeywords, IMPORTANT_SHORT_WORDS, STOP_WORDS };
