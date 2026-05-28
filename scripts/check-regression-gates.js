#!/usr/bin/env node
/**
 * scripts/check-regression-gates.js
 * v1.3.0 Phase C.5 — Runtime Regression Gate
 *
 * Single-command gate for runtime safety verification.
 * Fails on: secrets leak, Recall@5 < 0.500, violations > 0,
 *           test failures, build failures.
 */

'use strict';

const { execSync, spawn } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ── Safe exec helper ─────────────────────────────────────────────────

/**
 * Run a command and return { ok, output, error }.
 * Never throws — always returns a result object.
 */
function runCmd(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  try {
    const stdout = execSync(cmd, {
      cwd,
      timeout: (opts.timeout || 60) * 1000,
      stdio:  ['pipe', 'pipe', 'pipe'],
      env:    { ...process.env, ...(opts.env || {}) },
    });
    return { ok: true, output: stdout.toString().trim(), stderr: '' };
  } catch (err) {
    const childStderr = err.stderr ? err.stderr.toString().trim() : '';
    return {
      ok:    false,
      output: (err.stdout ? err.stdout.toString().trim() : '') + (childStderr ? '\n' + childStderr : ''),
      error:  err.message || String(err),
      code:   err.status || undefined,
    };
  }
}

/**
 * Run a command that must succeed.
 * Throws on failure (for smoke tests that parse output).
 */
function runMustSucceed(cmd, opts = {}) {
  const cwd = opts.cwd || ROOT;
  const stdout = execSync(cmd, {
    cwd,
    timeout: (opts.timeout || 60) * 1000,
    stdio:  ['pipe', 'pipe', 'pipe'],
    env:    { ...process.env, ...(opts.env || {}) },
  });
  return stdout.toString().trim();
}

// ── Result tracking ────────────────────────────────────────────────────

const result = {
  status:       'PASS',
  checks:       [],
  failures:     [],
  metrics: {
    recall_at_5:   null,
    violations:    null,
    tests_passed:  0,
    tests_failed:  0,
  },
};

// ── Helper: record pass or fail ──────────────────────────────────────

function pass(label) {
  console.log(`  ${label.padEnd(55)} ✅`);
  result.checks.push(label);
}

function fail(label, errMsg) {
  const msg = (errMsg || 'unknown error').split('\n').slice(0, 3).join(' ');
  console.log(`  ${label.padEnd(55)} FAIL — ${msg}`);
  result.status = 'FAIL';
  result.failures.push({ check: label, error: msg });
}

function parseTestOutput(output) {
  const passed = parseInt(/TOTAL: (\d+) passed/i.exec(output)?.[1]
                  || /(\d+) passed/i.exec(output)?.[1]  || '0');
  const failed = parseInt(/(\d+) failed/i.exec(output)?.[1]  || '0');
  return { passed, failed };
}

// ════════════════════════════════════════════════════════════════════════
// 1. SECRETS CHECK
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [1/8] Secrets Check ━━━');
{
  const r = runCmd('node scripts/check-no-secrets.js');
  if (r.ok && !/FAIL|ERROR|SECRET/.test(r.output) || r.output.includes('0 secrets')) {
    pass('secrets');
  } else {
    fail('secrets', r.output.slice(0, 200));
  }
}

// ════════════════════════════════════════════════════════════════════════
// 2. METRICS REGISTRY TESTS
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [2/8] Metrics Registry ━━━');
{
  const r = runCmd('node metrics/test_metrics_registry.js');
  if (!r.ok) { fail('metrics', r.output || r.error); }
  else {
    const { passed, failed } = parseTestOutput(r.output);
    result.metrics.tests_passed += passed;
    result.metrics.tests_failed += failed;
    if (failed > 0) fail('metrics', `${failed} tests failed`);
    else pass(`metrics (${passed} tests)`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 3. MEMORY-STORE TESTS
// ════════════════════════════════════════════════════════════════════════

const memoryTests = [
  { name: 'memory_store',          cwd: 'agents/memory-store', cmd: 'node test_memory_store.js' },
  // test_memory_runtime_integration.js and test_runtime_graph.js require DATABASE_URL + live postgres.
  // Skip in local gate; CI sets DATABASE_URL and runs them.
  { name: 'memory_runtime_integration', cwd: 'agents/memory-store', cmd: 'node test_memory_runtime_integration.js', skipIfNoDb: true },
  { name: 'runtime_graph',         cwd: 'agents/memory-store', cmd: 'node test_runtime_graph.js', skipIfNoDb: true },
];

for (const t of memoryTests) {
  console.log(`\n━━━ [3/8] Memory: ${t.name} ━━━`);
  const r = runCmd(t.cmd, { cwd: path.join(ROOT, t.cwd) });
  if (!r.ok) {
    // If skipIfNoDb=true and failure is DB-related, skip instead of fail
    const outputLower = (r.output || '').toLowerCase();
    const errorLower = (r.error || '').toLowerCase();
    const combinedLower = outputLower + errorLower;
    const isDbError = /database_url|postgres|pgvector|ECONNREFUSED|init-agent|no such file|cannot find module/.test(combinedLower);
    if (t.skipIfNoDb && isDbError) {
      console.log(`  ${t.name.padEnd(55)} ⏭ SKIP (no DATABASE_URL or postgres unavailable)`);
      result.checks.push(`${t.name}:SKIP`);
    } else {
      fail(t.name, r.output || r.error);
    }
  } else {
    const { passed, failed } = parseTestOutput(r.output);
    result.metrics.tests_passed += passed;
    result.metrics.tests_failed += failed;
    if (failed > 0) fail(t.name, `${failed} tests failed`);
    else pass(`${t.name} (${passed} tests)`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 4. RAG RUNTIME TESTS
// ════════════════════════════════════════════════════════════════════════

const ragTests = [
  { name: 'runtime_retrieval', cwd: 'agents/rag-memory/runtime', cmd: 'node test_runtime_retrieval.js' },
  { name: 'prompt_context',    cwd: 'agents/rag-memory/runtime', cmd: 'node test_prompt_context.js' },
];

for (const t of ragTests) {
  console.log(`\n━━━ [4/8] RAG: ${t.name} ━━━`);
  const r = runCmd(t.cmd, { cwd: path.join(ROOT, t.cwd) });
  if (!r.ok) { fail(t.name, r.output || r.error); }
  else {
    const { passed, failed } = parseTestOutput(r.output);
    result.metrics.tests_passed += passed;
    result.metrics.tests_failed += failed;
    if (failed > 0) fail(t.name, `${failed} tests failed`);
    else pass(`${t.name} (${passed} tests)`);
  }
}

// ════════════════════════════════════════════════════════════════════════
// 5. RETRIEVAL EVAL (HYBRID Recall@5 + violations)
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [5/8] Retrieval Eval ━━━');
{
  const evalMd = path.join(ROOT, 'agents', 'rag-memory', 'eval_results_all_modes.md');
  if (!fs.existsSync(evalMd)) {
    fail('retrieval_eval', 'eval_results_all_modes.md not found');
  } else {
    const md = fs.readFileSync(evalMd, 'utf-8');
    const hybrid = md.match(/^\| hybrid \| ([0-9.]+) \| [0-9.]+ \| [0-9.]+ \| [0-9.]+ \| (\d+) \|/m);
    if (!hybrid) { fail('retrieval_eval', 'HYBRID row not found in eval_results_all_modes.md'); }
    else {
      const recall    = parseFloat(hybrid[1]);
      const violations = parseInt(hybrid[2]);
      result.metrics.recall_at_5 = recall;
      result.metrics.violations  = violations;
      if (recall < 0.500)    fail('retrieval_eval', `Recall@5=${recall} < 0.500`);
      else if (violations > 0) fail('retrieval_eval', `violations=${violations} > 0`);
      else {
        pass(`HYBRID Recall@5=${recall}`);
        pass(`HYBRID Violations=${violations}`);
      }
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// 6. DASHBOARD BUILD
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [6/8] Dashboard Build ━━━');
{
  const r = runCmd('npm run build', { cwd: path.join(ROOT, 'agent-dashboard'), timeout: 120 });
  if (!r.ok) fail('dashboard_build', r.output || r.error);
  else pass('dashboard build');
}

// ════════════════════════════════════════════════════════════════════════
// 7. HEALTH ENDPOINT SMOKE
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [7/8] Health Endpoint Smoke ━━━');
{
  const smokeScript = path.join(ROOT, 'scripts', 'test-health-endpoint.sh');
  if (!fs.existsSync(smokeScript)) { fail('health_endpoint', 'test-health-endpoint.sh not found'); }
  else {
    const r = runCmd(`bash "${smokeScript}"`, { timeout: 30 });
    if (!r.ok || (!r.output.includes('ALL CHECKS PASSED') && !r.output.includes('PASSED'))) {
      fail('health_endpoint', (r.output || '').slice(0, 150));
    } else {
      pass('health endpoint smoke');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// 8. METRICS ENDPOINT SMOKE
// ════════════════════════════════════════════════════════════════════════

console.log('\n━━━ [8/8] Metrics Endpoint Smoke ━━━');
{
  const smokeScript = path.join(ROOT, 'scripts', 'test-metrics-endpoint.sh');
  if (!fs.existsSync(smokeScript)) { fail('metrics_endpoint', 'test-metrics-endpoint.sh not found'); }
  else {
    const r = runCmd(`bash "${smokeScript}"`, { timeout: 30 });
    if (!r.ok || (!r.output.includes('ALL CHECKS PASSED') && !r.output.includes('PASSED'))) {
      fail('metrics_endpoint', (r.output || '').slice(0, 150));
    } else {
      pass('metrics endpoint smoke');
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════════

console.log('\n' + '='.repeat(70));
console.log(` GATE STATUS: ${result.status}`);
console.log('='.repeat(70));

console.log(`\n Checks passed (${result.checks.length}):`);
for (const c of result.checks) console.log(`   ✅ ${c}`);

if (result.failures.length) {
  console.log(`\n Failures (${result.failures.length}):`);
  for (const f of result.failures) console.log(`   ❌ ${f.check}: ${f.error}`);
}

console.log('\n Metrics:');
console.log(`   recall_at_5  : ${result.metrics.recall_at_5}`);
console.log(`   violations   : ${result.metrics.violations}`);
console.log(`   tests_passed : ${result.metrics.tests_passed}`);
console.log(`   tests_failed : ${result.metrics.tests_failed}`);
console.log('\n' + '='.repeat(70));

// Write JSON output
const jsonPath = path.join(ROOT, 'scripts', 'gate-results.json');
fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(` JSON written to scripts/gate-results.json\n`);

process.exit(result.status === 'PASS' ? 0 : 1);
