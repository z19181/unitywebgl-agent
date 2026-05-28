#!/usr/bin/env node
/**
 * scripts/phase1-device-qa-summary.js
 *
 * 读取 docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md（人工填写后），
 * 解析 META 区块，判断 Phase 1 人工真机验证是否通过。
 *
 * 用法:
 *   node scripts/phase1-device-qa-summary.js [path/to/result.md]
 *
 * 默认路径: docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md
 *
 * 输出:
 *   PHASE_1_MANUAL_QA_APPROVED=true   ← 全部通过
 *   PHASE_1_MANUAL_QA_APPROVED=false  ← 有 FAIL 或未审批或缺失平台
 *   exit code: 0 (approved) / 1 (not approved)
 */

const fs = require('fs');
const path = require('path');

const RESULT_PATH = process.argv[2] || path.join(__dirname, '..', 'docs', 'MANUAL_DEVICE_QA_RESULT_TEMPLATE.md');

// Known default template values that indicate "not filled in"
const TEMPLATE_DEFAULTS = new Set([
  '填写测试人姓名', '',
  '2026-05-XX',
  'PENDING', 'NOT_TESTED'
]);

// ── Parse ───────────────────────────────────────────────────

function parseMetaValue(raw) {
  // Strip trailing YAML comment (# ...)
  let v = raw.replace(/\s*#.*$/, '').trim();
  // Strip surrounding quotes
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

function parseResult(content) {
  // Extract META block between # META_START and # META_END
  const metaMatch = content.match(/# META_START\s*\n([\s\S]*?)# META_END/);
  if (!metaMatch) {
    return { error: 'META block not found. Ensure the result file has # META_START ... # META_END' };
  }

  const meta = {};
  const lines = metaMatch[1].split('\n');
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.+)$/);
    if (m) {
      meta[m[1]] = parseMetaValue(m[2]);
    }
  }

  // Required platforms
  const requiredPlatforms = ['os_ios_safari', 'os_ios_wechat', 'os_android_chrome', 'os_android_wechat'];
  const missingPlatforms = requiredPlatforms.filter(p => !meta[p] || meta[p] === 'NOT_TESTED' || TEMPLATE_DEFAULTS.has(meta[p]));

  // Check PASS on all platforms
  const failedPlatforms = requiredPlatforms.filter(p => meta[p] === 'FAIL');

  // Check blocking issues count
  const blockingCount = parseInt(meta.blocking_issues_count || '0', 10);

  // Check approval status
  const approval = meta.approval_status || 'PENDING';
  const isApproved = approval === 'APPROVED';

  // Also check for explicit "批准进入 1% 灰度" block in the document
  const approvalSection = content.includes('批准进入 1% 灰度');
  const explicitYes = /批准进入.*灰度.*\n.*YES/i.test(content);

  return {
    meta,
    requiredPlatforms,
    missingPlatforms,
    failedPlatforms,
    blockingCount,
    approval,
    isApproved: isApproved || explicitYes,
    approvalSectionExists: approvalSection,
    error: null
  };
}

function evaluate(parsed) {
  const { meta, missingPlatforms, failedPlatforms, blockingCount, isApproved, error } = parsed;

  const issues = [];

  if (error) {
    issues.push(`ERROR: ${error}`);
  }

  // Check if template is still in default state (not filled in)
  const stillTemplate = meta.test_person === '填写测试人姓名' || meta.test_date === '2026-05-XX';
  if (stillTemplate) {
    issues.push('TEMPLATE_NOT_FILLED: Result template has not been filled in. Test person and date are still defaults.');
  }

  if (missingPlatforms.length > 0) {
    issues.push(`MISSING PLATFORMS: ${missingPlatforms.join(', ')} — must be tested (PASS or FAIL)`);
  }

  if (failedPlatforms.length > 0) {
    issues.push(`FAILED PLATFORMS: ${failedPlatforms.join(', ')} — all platforms must PASS`);
  }

  if (!isApproved) {
    issues.push(`APPROVAL: status is "${meta.approval_status || 'PENDING'}", expected "APPROVED"`);
  }

  if (blockingCount > 0) {
    issues.push(`BLOCKING ISSUES: ${blockingCount} blocking issue(s) recorded — must be 0`);
  }

  const approved = issues.length === 0;

  return {
    approved,
    issues,
    meta,
    summary: {
      template_filled: !stillTemplate,
      platforms_tested: 4 - missingPlatforms.length,
      platforms_required: 4,
      platforms_pass: 4 - missingPlatforms.length - failedPlatforms.length,
      platforms_fail: failedPlatforms.length,
      platforms_missing: missingPlatforms.length,
      blocking_issues: blockingCount,
      non_blocking_issues: parseInt(meta.non_blocking_issues_count || '0', 10),
      approval_status: meta.approval_status || 'PENDING',
      version_tag: meta.version_tag || 'unknown',
      test_person: meta.test_person || 'unknown',
      test_date: meta.test_date || 'unknown'
    }
  };
}

// ── Main ────────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(RESULT_PATH)) {
    console.log(`PHASE_1_MANUAL_QA_APPROVED=false`);
    console.log(`# REASON: Result file not found: ${RESULT_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(RESULT_PATH, 'utf8');
  const parsed = parseResult(content);
  const result = evaluate(parsed);

  // Output result
  console.log(`PHASE_1_MANUAL_QA_APPROVED=${result.approved}`);
  console.log(`# SUMMARY: ${JSON.stringify(result.summary)}`);

  if (!result.approved) {
    console.log(`# ISSUES:`);
    for (const issue of result.issues) {
      console.log(`#   - ${issue}`);
    }
  }

  process.exit(result.approved ? 0 : 1);
}

main();
