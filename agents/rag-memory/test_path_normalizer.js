// ========================================
// v1.2.0 Phase B.3 — Path Normalizer Tests
// ========================================
import { normalizePath, pathsMatch, findBestPathMatch, PROJECT_ROOT } from './path_normalizer.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

console.log('Path Normalizer Tests\n');

test('strips ./ prefix', () => {
  const { clean } = normalizePath('./docs/foo.md');
  assert(clean === 'docs/foo.md', `Got: ${clean}`);
});

test('strips absolute prefix', () => {
  const full = PROJECT_ROOT + '/docs/foo.md';
  const { clean } = normalizePath(full);
  assert(clean === 'docs/foo.md', `Got: ${clean}`);
});

test('normalizes forward slashes', () => {
  const { clean } = normalizePath('docs/sub/file.md');
  assert(clean === 'docs/sub/file.md', `Got: ${clean}`);
});

test('removes trailing slash', () => {
  const { clean } = normalizePath('docs/test/');
  assert(clean === 'docs/test', `Got: ${clean}`);
});

test('empty input', () => {
  const { clean, normalized } = normalizePath('');
  assert(clean === '' && normalized === '');
});

test('prompts path preserved', () => {
  const { clean } = normalizePath('prompts/qclaw_review.prompt.md');
  assert(clean === 'prompts/qclaw_review.prompt.md', `Got: ${clean}`);
});

test('case-insensitive match', () => {
  assert(pathsMatch('Docs/BASELINE.md', 'docs/baseline.md'));
});

test('exact match via findBestPathMatch', () => {
  const result = findBestPathMatch('docs/BASELINE.md', ['docs/baseline.md', 'other.md']);
  assert(result.matched, 'Should match');
  assert(result.score === 1.0, `Score: ${result.score}`);
});

test('filename match via findBestPathMatch', () => {
  const result = findBestPathMatch('prompts/qclaw_review.prompt.md', ['some/dir/qclaw_review.prompt.md']);
  assert(result.matched, 'Should match by filename');
  assert(result.score === 0.8, `Score: ${result.score}`);
});

test('no match', () => {
  const result = findBestPathMatch('nonexistent.md', ['a.md', 'b.md']);
  assert(!result.matched);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
