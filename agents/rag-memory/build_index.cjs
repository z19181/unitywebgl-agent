const fs = require('fs');
const path = require('path');
const { extractKeywords } = require('./tokenizer.cjs');

// ========================================
// v1.2.0 Phase A - RAG Memory Minimal Loop
// build_index.js
// 功能:扫描 docs/、agents/、UnityExamples/*.md、根目录重要 md
//       输出本地 JSON 索引:agents/rag-memory/index.json
// 暂时不用真实 embedding,先实现 keyword + simple scoring
// ========================================

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(__dirname, 'index.json');

// 必须索引的目录
const TARGET_DIRS = [
  path.join(PROJECT_ROOT, 'docs'),
  path.join(PROJECT_ROOT, 'agents'),
  path.join(PROJECT_ROOT, 'UnityExamples'),
  PROJECT_ROOT,  // 根目录重要 md
];

// 必须排除的模式
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'UnityExamples/**/Library',
  'agent-dashboard/node_modules',
  '*.log',
  '*.tmp',
  '.qclaw_handoff',
  'agents/rag-memory/logs',
  'eval_results',
  'agents/memory',
];

// 根目录重要 md 文件(白名单)
const ROOT_MD_WHITELIST = [
  'README.md',
  'CHANGELOG.md',
  'LICENSE.md',
  'BASELINE.md',
  'PARTY_GAME_SDK_FINAL_HANDOFF.md',
];

// ========================================
// 工具函数
// ========================================

function shouldExclude(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  return EXCLUDE_PATTERNS.some(pattern => {
    // 简单 glob 匹配(支持 **、*、?)
    const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.') + '$');
    return regex.test(relativePath) || relativePath.includes(pattern.replace(/\*/g, ''));
  });
}

function scanDirectory(dirPath, extensions = ['.md', '.js', '.ts', '.cs']) {
  const results = [];

  if (!fs.existsSync(dirPath)) {
    console.warn(`[WARN] Directory not found: ${dirPath}`);
    return results;
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const itemPath = path.join(dirPath, item.name);

    // 排除检查
    if (shouldExclude(itemPath)) continue;

    if (item.isDirectory()) {
      // 递归扫描子目录
      results.push(...scanDirectory(itemPath, extensions));
    } else if (item.isFile() && extensions.includes(path.extname(item.name))) {
      results.push(itemPath);
    }
  }

  return results;
}

function scanRootMarkdownFiles() {
  const results = [];
  for (const fileName of ROOT_MD_WHITELIST) {
    const filePath = path.join(PROJECT_ROOT, fileName);
    if (fs.existsSync(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}

function readFileContent(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[ERROR] Failed to read ${filePath}: ${err.message}`);
    return '';
  }
}


function buildIndex() {
  console.log('[Build Index] Starting...');
  console.log(`[Build Index] Project root: ${PROJECT_ROOT}`);

  const allFiles = [];

  // 1. 扫描 docs/
  console.log('[Build Index] Scanning docs/...');
  const docsFiles = scanDirectory(path.join(PROJECT_ROOT, 'docs'), ['.md']);
  allFiles.push(...docsFiles);
  console.log(`[Build Index] Found ${docsFiles.length} files in docs/`);

  // 2. 扫描 agents/ (索引所有 .md 文件 — SOUL, POLICY, IMPLEMENTATION, etc.)
  console.log('[Build Index] Scanning agents/...');
  const agentFiles = scanDirectory(path.join(PROJECT_ROOT, 'agents'), ['.md']);
  allFiles.push(...agentFiles);
  console.log(`[Build Index] Found ${agentFiles.length} agent files`);

  // 3. 扫描 UnityExamples/*.md
  console.log('[Build Index] Scanning UnityExamples/*.md...');
  const unityMdFiles = scanDirectory(path.join(PROJECT_ROOT, 'UnityExamples'), ['.md']);
  allFiles.push(...unityMdFiles);
  console.log(`[Build Index] Found ${unityMdFiles.length} files in UnityExamples/`);

  // 4. 扫描 prompts/
  console.log('[Build Index] Scanning prompts/...');
  const promptsFiles = scanDirectory(path.join(PROJECT_ROOT, 'prompts'), ['.md']);
  allFiles.push(...promptsFiles);
  console.log(`[Build Index] Found ${promptsFiles.length} files in prompts/`);

  // 5. 扫描 docker/ (.yml, .yaml, .md, .json)
  console.log('[Build Index] Scanning docker/...');
  const dockerFiles = scanDirectory(path.join(PROJECT_ROOT, 'docker'), ['.yml', '.yaml', '.md', '.json']);
  allFiles.push(...dockerFiles);
  console.log(`[Build Index] Found ${dockerFiles.length} files in docker/`);

  // 6. 扫描 scripts/ (.js, .sh, .md)
  console.log('[Build Index] Scanning scripts/...');
  const scriptsFiles = scanDirectory(path.join(PROJECT_ROOT, 'scripts'), ['.js', '.sh', '.md']);
  allFiles.push(...scriptsFiles);
  console.log(`[Build Index] Found ${scriptsFiles.length} files in scripts/`);

  // 7. 扫描根目录重要 md
  console.log('[Build Index] Scanning root markdown files...');
  const rootMdFiles = scanRootMarkdownFiles();
  allFiles.push(...rootMdFiles);
  console.log(`[Build Index] Found ${rootMdFiles.length} root markdown files`);

  // 去重
  const uniqueFiles = [...new Set(allFiles)];
  console.log(`[Build Index] Total unique files: ${uniqueFiles.length}`);

  // 构建索引
  const index = {
    version: '1.0.0',
    builtAt: new Date().toISOString(),
    stats: {
      totalFiles: uniqueFiles.length,
      docsFiles: docsFiles.length,
      agentFiles: agentFiles.length,
      unityMdFiles: unityMdFiles.length,
      rootMdFiles: rootMdFiles.length,
    },
    files: [],
  };

  for (const filePath of uniqueFiles) {
    const content = readFileContent(filePath);
    const keywords = extractKeywords(content);
    const stats = fs.statSync(filePath);

    index.files.push({
      path: path.relative(PROJECT_ROOT, filePath),
      absolutePath: filePath,
      size: stats.size,
      mtime: stats.mtime.toISOString(),
      keywords: keywords.slice(0, 100),  // 只保留前 100 个 keywords
      keywordCount: keywords.length,
    });
  }

  // 写入 index.json
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`[Build Index] Index written to ${OUTPUT_PATH}`);
  console.log(`[Build Index] Stats: ${JSON.stringify(index.stats, null, 2)}`);

  return index;
}

// ========================================
// Main
// ========================================

if (require.main === module) {
  try {
    const index = buildIndex();
    console.log('[Build Index] ✅ SUCCESS');
    console.log(`[Build Index] Indexed ${index.stats.totalFiles} files`);
  } catch (err) {
    console.error('[Build Index] ❌ FAILED:', err.message);
    process.exit(1);
  }
}

module.exports = { buildIndex, extractKeywords, shouldExclude, scanDirectory };
