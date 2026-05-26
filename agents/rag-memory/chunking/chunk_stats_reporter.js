// ========================================
// v1.2.0 Phase B.2 — Chunk Stats Reporter
// Generates chunk quality report in markdown
// ========================================

import * as analyzer from './chunk_quality_analyzer.js';

/**
 * Generate a comprehensive chunk quality report
 * @param {Array} chunks - all chunks from the new pipeline
 * @param {Object} oldStats - previous chunk stats for comparison (optional)
 * @returns {string} - markdown report
 */
export function generateReport(chunks, oldStats = null) {
  const stats = analyzer.computeChunkStats(chunks);
  const dist = analyzer.chunkSizeDistribution(chunks);
  const gov = analyzer.governanceCoverage(chunks);
  const validation = analyzer.validateChunkQuality(stats);

  let md = '# Chunk Quality Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;

  // ---- Summary ----
  md += '## 1. Overall Quality Score\n\n';
  md += `**Score: ${validation.score}/100** ${validation.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;
  if (validation.issues.length > 0) {
    md += '### Issues\n\n';
    for (const issue of validation.issues) {
      md += `- ${issue}\n`;
    }
    md += '\n';
  }

  // ---- Core Stats ----
  md += '## 2. Core Metrics\n\n';
  md += '| Metric | Value | Target | Status |\n';
  md += '|--------|-------|--------|--------|\n';
  md += `| Total chunks | ${stats.total_chunks} | — | — |\n`;
  md += `| Avg chars | ${stats.avg_chars} | ≥ 500 | ${stats.avg_chars >= 500 ? '✅' : '❌'} |\n`;
  md += `| Median chars | ${stats.median_chars} | ≥ 400 | ${stats.median_chars >= 400 ? '✅' : '❌'} |\n`;
  md += `| Min chars | ${stats.min_chars} | ≥ 120 | ${stats.min_chars >= 120 ? '✅' : '❌'} |\n`;
  md += `| Max chars | ${stats.max_chars} | ≤ 3000 | ${stats.max_chars <= 3000 ? '✅' : '❌'} |\n`;
  md += `| Header-only | ${stats.header_only} | 0 | ${stats.header_only === 0 ? '✅' : '❌'} |\n`;
  md += `| Header-dominated | ${stats.header_dominated} | < 10% | ${stats.header_dominated < stats.total_chunks * 0.10 ? '✅' : '❌'} |\n`;
  md += `| Tiny chunks (<120) | ${stats.tiny_chunks} (${stats.tiny_pct}%) | ≤ 3% | ${stats.tiny_pct <= 3 ? '✅' : '❌'} |\n`;
  md += `| Governance chunks | ${stats.governance_chunks} | ≥ 1 | ${stats.governance_chunks >= 1 ? '✅' : '❌'} |\n`;
  md += `| Total chars | ${stats.total_chars.toLocaleString()} | — | — |\n`;
  md += '\n';

  // ---- Percentiles ----
  md += '## 3. Size Distribution\n\n';
  md += '| Percentile | Chars |\n';
  md += '|------------|-------|\n';
  md += `| P25 | ${stats.p25_chars} |\n`;
  md += `| P50 (median) | ${stats.median_chars} |\n`;
  md += `| P75 | ${stats.p75_chars} |\n`;
  md += `| P90 | ${stats.p90_chars} |\n\n`;

  md += '### Size Buckets\n\n';
  md += '| Range | Count | % |\n';
  md += '|-------|-------|---|\n';
  const total = stats.total_chunks;
  for (const [range, count] of Object.entries(dist)) {
    const pct = total > 0 ? (count / total * 100).toFixed(1) : '0.0';
    md += `| ${range} | ${count} | ${pct}% |\n`;
  }
  md += '\n';

  // ---- Governance ----
  md += '## 4. Governance Coverage\n\n';
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Governance chunk count | ${gov.governance_chunk_count} |\n`;
  md += `| Governance char % | ${gov.governance_char_pct}% |\n`;
  md += `| Avg gov chunk size | ${gov.avg_gov_chunk_size} chars |\n`;
  if (gov.governance_files.length > 0) {
    md += `\n### Governance Files\n\n`;
    for (const f of gov.governance_files) {
      md += `- \`${f}\`\n`;
    }
  }
  md += '\n';

  // ---- Comparison (if old stats available) ----
  if (oldStats) {
    md += '## 5. Before / After Comparison\n\n';
    md += '| Metric | Before | After | Delta |\n';
    md += '|--------|--------|-------|-------|\n';
    md += `| Total chunks | ${oldStats.total_chunks} | ${stats.total_chunks} | ${stats.total_chunks - oldStats.total_chunks} |\n`;
    md += `| Avg chars | ${oldStats.avg_chars} | ${stats.avg_chars} | ${stats.avg_chars - oldStats.avg_chars} |\n`;
    md += `| Median chars | ${oldStats.median_chars} | ${stats.median_chars} | ${stats.median_chars - oldStats.median_chars} |\n`;
    md += `| Header-only | ${oldStats.header_only} | ${stats.header_only} | ${stats.header_only - oldStats.header_only} |\n`;
    md += `| Tiny chunks | ${oldStats.tiny_chunks} | ${stats.tiny_chunks} | ${stats.tiny_chunks - oldStats.tiny_chunks} |\n`;
    md += `| Governance chunks | ${oldStats.governance_chunks} | ${stats.governance_chunks} | ${stats.governance_chunks - oldStats.governance_chunks} |\n`;
    md += '\n';
  }

  // ---- Per-file stats ----
  md += '## 6. Per-File Chunk Count\n\n';
  const byFile = {};
  for (const c of chunks) {
    const f = c.metadata.source_file;
    if (!byFile[f]) byFile[f] = { count: 0, chars: 0, gov: 0 };
    byFile[f].count++;
    byFile[f].chars += c.metadata.char_count;
    if (c.metadata.is_governance) byFile[f].gov++;
  }

  md += '| File | Chunks | Avg chars | Governance |\n';
  md += '|------|--------|-----------|------------|\n';
  const sortedFiles = Object.entries(byFile).sort((a, b) => b[1].count - a[1].count);
  for (const [file, info] of sortedFiles.slice(0, 20)) {
    const avg = Math.round(info.chars / info.count);
    md += `| \`${file}\` | ${info.count} | ${avg} | ${info.gov > 0 ? '✅' : ''} |\n`;
  }
  if (sortedFiles.length > 20) {
    md += `| ... (${sortedFiles.length - 20} more) | | | |\n`;
  }
  md += '\n';

  // ---- Worst chunks (tiny ones) ----
  const tinyChunks = chunks
    .filter(c => c.metadata.char_count < 120)
    .sort((a, b) => a.metadata.char_count - b.metadata.char_count)
    .slice(0, 10);

  if (tinyChunks.length > 0) {
    md += '## 7. Top Tiny Chunks (quality risk)\n\n';
    for (const c of tinyChunks) {
      const preview = c.content.slice(0, 80).replace(/\n/g, ' ');
      md += `- **${c.metadata.char_count} chars** — \`${c.metadata.source_file}\` — "${preview}..."\n`;
    }
    md += '\n';
  }

  return md;
}

export { computeChunkStats } from './chunk_quality_analyzer.js';
export { chunkSizeDistribution, governanceCoverage, validateChunkQuality } from './chunk_quality_analyzer.js';
