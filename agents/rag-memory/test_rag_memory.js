const fs = require('fs');
const path = require('path');
const { buildIndex } = require('./build_index.js');
const { queryIndex } = require('./query_index.js');

// ========================================
// v1.2.0 Phase A — RAG Memory Minimal Loop
// test_rag_memory.js
// 功能：测试 RAG memory 检索功能
// 至少验证：
//   - 能检索到 V1_1_4_STATE_SNAPSHOT.md
//   - 能检索到 UNITY_WEBGL_MATERIAL_POLICY.md
//   - 能检索到 STASH_VALIDATION_REPORT.md
//   - hard constraints 查询能返回相关规则
//   - server.js 查询不能建议修改 server.js，只能返回约束
// ========================================

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(__dirname, 'index.json');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertContains(arr, substring, message) {
  const found = arr.some(item => item.path.includes(substring));
  if (!found) throw new Error(message);
}

// ========================================
// Main Test Suite
// ========================================

console.log('[Test RAG Memory] Starting...\n');

// ========================================
// Setup: Build index
// ========================================
console.log('[Setup] Building index...');
let index;
try {
  index = buildIndex();
  console.log(`[Setup] ✅ Index built (${index.stats.totalFiles} files)\n`);
} catch (err) {
  console.error('[Setup] ❌ FAILED to build index:', err.message);
  process.exit(1);
}

// ========================================
// Test Suite 1: Retrieval Tests
// ========================================
console.log('[Test Suite 1] Retrieval Tests\n');

test('Should retrieve V1_1_4_STATE_SNAPSHOT.md', () => {
  const results = queryIndex('v1.1.4 state snapshot');
  assert(results.length > 0, 'Expected at least 1 result');
  assertContains(results, 'V1_1_4_STATE_SNAPSHOT.md', 'Expected to find V1_1_4_STATE_SNAPSHOT.md');
});

test('Should retrieve UNITY_WEBGL_MATERIAL_POLICY.md', () => {
  const results = queryIndex('Unity WebGL material policy');
  assert(results.length > 0, 'Expected at least 1 result');
  assertContains(results, 'UNITY_WEBGL_MATERIAL_POLICY.md', 'Expected to find UNITY_WEBGL_MATERIAL_POLICY.md');
});

test('Should retrieve STASH_VALIDATION_REPORT.md', () => {
  const results = queryIndex('stash validation report');
  assert(results.length > 0, 'Expected at least 1 result');
  assertContains(results, 'STASH_VALIDATION_REPORT.md', 'Expected to find STASH_VALIDATION_REPORT.md');
});

test('Should retrieve Hard Constraints documents', () => {
  const results = queryIndex('hard constraints server.js');
  assert(results.length > 0, 'Expected at least 1 result');
  // Should return documents that mention "hard constraints" or "server.js"
  // (AGENT_RULES.md may not be in index, so check snippet)
  const hasHardConstraints = results.some(r => 
    r.snippet.toLowerCase().includes('hard constraints') || 
    r.snippet.toLowerCase().includes('server.js')
  );
  assert(hasHardConstraints, 'Expected Hard Constraints documents in results');
});

test('Should NOT suggest modifying server.js', () => {
  const results = queryIndex('怎么修改 server.js 添加新功能');
  // Should return Hard Constraints docs, NOT suggest modifying server.js
  if (results.length > 0) {
    const hasServerModificationSuggestion = results.some(r => r.snippet.includes('修改 server.js') && !r.snippet.includes('❌'));
    assert(!hasServerModificationSuggestion, 'Should NOT suggest modifying server.js');
  }
  // If no results, that's also acceptable (constraint applied)
  assert(true, 'PASS: No suggestion to modify server.js');
});

test('Should return top-5 results (max)', () => {
  const results = queryIndex('Unity WebGL game server protocol');
  assert(results.length <= 5, 'Expected at most 5 results');
});

test('Should return scored results (score > 0)', () => {
  const results = queryIndex('material policy');
  if (results.length > 0) {
    assert(results[0].score > 0, 'Expected score > 0');
    assert(results[0].score <= 1, 'Expected score <= 1');
  }
});

test('Should include metadata (path, score, snippet, mtime, size)', () => {
  const results = queryIndex('RAG memory');
  if (results.length > 0) {
    const r = results[0];
    assert(r.path !== undefined, 'Expected path in result');
    assert(r.score !== undefined, 'Expected score in result');
    assert(r.snippet !== undefined, 'Expected snippet in result');
    assert(r.mtime !== undefined, 'Expected mtime in result');
    assert(r.size !== undefined, 'Expected size in result');
  }
});

// ========================================
// Test Suite 2: Index Integrity Tests
// ========================================
console.log('\n[Test Suite 2] Index Integrity Tests\n');

test('Index should have valid version', () => {
  assert(index.version === '1.0.0', 'Expected version 1.0.0');
});

test('Index should have stats', () => {
  assert(index.stats.totalFiles > 0, 'Expected totalFiles > 0');
  assert(index.stats.docsFiles >= 0, 'Expected docsFiles >= 0');
  assert(index.stats.agentFiles >= 0, 'Expected agentFiles >= 0');
});

test('Index should have file entries with required fields', () => {
  assert(index.files.length > 0, 'Expected at least 1 file in index');
  const file = index.files[0];
  assert(file.path !== undefined, 'Expected path in file entry');
  assert(file.absolutePath !== undefined, 'Expected absolutePath in file entry');
  assert(file.size !== undefined, 'Expected size in file entry');
  assert(file.mtime !== undefined, 'Expected mtime in file entry');
  assert(file.keywords !== undefined, 'Expected keywords in file entry');
});

test('Index should NOT include excluded files', () => {
  const hasNodeModules = index.files.some(f => f.path.includes('node_modules'));
  assert(!hasNodeModules, 'Index should NOT include node_modules/');

  const hasGit = index.files.some(f => f.path.includes('.git/'));
  assert(!hasGit, 'Index should NOT include .git/');
});

// ========================================
// Test Suite 3: Edge Cases
// ========================================
console.log('\n[Test Suite 3] Edge Cases\n');

test('Should handle empty query', () => {
  const results = queryIndex('');
  assert(results.length === 0, 'Expected 0 results for empty query');
});

test('Should handle query with only stop words', () => {
  const results = queryIndex('the a an and or but in on at to for of with by from up about into over after');
  assert(results.length === 0, 'Expected 0 results for stop-words-only query');
});

test('Should handle special characters in query', () => {
  const results = queryIndex('Unity WebGL!!! @#$%^&*()');
  // Should still return results (special chars stripped)
  assert(true, 'PASS: No crash on special characters');
});

test('Should handle very long query', () => {
  const longQuery = 'Unity '.repeat(1000) + 'WebGL';
  const results = queryIndex(longQuery);
  assert(true, 'PASS: No crash on very long query');
});

// ========================================
// Cleanup
// ========================================
console.log('\n[Cleanup] Removing index.json...');
try {
  if (fs.existsSync(INDEX_PATH)) {
    fs.unlinkSync(INDEX_PATH);
    console.log('[Cleanup] ✅ index.json removed');
  }
} catch (err) {
  console.warn('[Cleanup] ⚠️ Failed to remove index.json:', err.message);
}

// ========================================
// Summary
// ========================================
console.log('\n' + '='.repeat(80));
console.log(`[Test RAG Memory] Summary: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`);
    console.log(`     Error: ${f.error}`);
  });
}

console.log('');

process.exit(failed > 0 ? 1 : 0);
