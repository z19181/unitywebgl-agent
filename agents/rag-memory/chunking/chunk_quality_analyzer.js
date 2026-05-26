// ========================================
// v1.2.0 Phase B.2 — Chunk Quality Analyzer
// ========================================
// Metrics computation and quality validation
// ========================================

const TINY_CHUNK_THRESHOLD = 120;      // chars: "tiny" if below this
const HEADING_BODY_RATIO = 0.15;       // heading chars / total chars ratio
const TARGET_AVG_CHARS = 500;          // desired average chunk size
const MAX_TINY_CHUNK_PCT = 3;         // max % of chunks allowed < 120 chars
const GOV_WEIGHT_FLOOR = 0.20;        // governance boost minimum

/**
 * Check if chunk is header-dominated (most content is headings, little body)
 */
function isHeaderDominated(chunk) {
  const content = chunk.content;
  const headingLines = (content.match(/^#{1,6}\s+.+$/gm) || []).join('\n');
  if (!headingLines) return false;
  const ratio = headingLines.length / Math.max(content.length, 1);
  return ratio > HEADING_BODY_RATIO && chunk.metadata.char_count < 300;
}

/**
 * Extract actual body text (non-heading lines)
 */
function bodyCharCount(chunk) {
  const lines = chunk.content.split('\n');
  return lines
    .filter(l => !l.match(/^#{1,6}\s+/))
    .join('\n')
    .trim()
    .length;
}

/**
 * Compute comprehensive chunk statistics
 */
export function computeChunkStats(chunks) {
  if (!chunks || chunks.length === 0) {
    return {
      total_chunks: 0,
      avg_chars: 0,
      median_chars: 0,
      min_chars: 0,
      max_chars: 0,
      header_only: 0,
      header_dominated: 0,
      tiny_chunks: 0,
      tiny_pct: 0,
      governance_chunks: 0,
      total_chars: 0,
      body_chars_total: 0,
    };
  }

  const charCounts = chunks.map(c => c.metadata.char_count).sort((a, b) => a - b);
  const total = charCounts.length;

  const headerOnly = chunks.filter(c => {
    const bodyChars = bodyCharCount(c);
    return bodyChars < 20;
  }).length;

  const headerDominated = chunks.filter(c => isHeaderDominated(c)).length;
  const tinyChunks = charCounts.filter(c => c < TINY_CHUNK_THRESHOLD).length;
  const governanceChunks = chunks.filter(c => c.metadata.is_governance).length;
  const totalChars = charCounts.reduce((a, b) => a + b, 0);
  const totalBodyChars = chunks.reduce((s, c) => s + bodyCharCount(c), 0);

  return {
    total_chunks: total,
    avg_chars: Math.round(totalChars / total),
    avg_body_chars: Math.round(totalBodyChars / total),
    median_chars: charCounts[Math.floor(total / 2)],
    min_chars: charCounts[0],
    max_chars: charCounts[total - 1],
    p25_chars: charCounts[Math.floor(total * 0.25)],
    p75_chars: charCounts[Math.floor(total * 0.75)],
    p90_chars: charCounts[Math.floor(total * 0.9)],
    header_only: headerOnly,
    header_dominated: headerDominated,
    tiny_chunks: tinyChunks,
    tiny_pct: Math.round((tinyChunks / total) * 1000) / 10,
    governance_chunks: governanceChunks,
    total_chars: totalChars,
    body_chars_total: totalBodyChars,
  };
}

/**
 * Distribution analysis — which size buckets do chunks fall into?
 */
export function chunkSizeDistribution(chunks) {
  const buckets = {
    '0-120': 0,
    '120-250': 0,
    '250-500': 0,
    '500-1000': 0,
    '1000-2000': 0,
    '2000+': 0,
  };

  for (const c of chunks) {
    const chars = c.metadata.char_count;
    if (chars < 120) buckets['0-120']++;
    else if (chars < 250) buckets['120-250']++;
    else if (chars < 500) buckets['250-500']++;
    else if (chars < 1000) buckets['500-1000']++;
    else if (chars < 2000) buckets['1000-2000']++;
    else buckets['2000+']++;
  }

  return buckets;
}

/**
 * Governance retrieval quality check
 */
export function governanceCoverage(chunks) {
  const govChunks = chunks.filter(c => c.metadata.is_governance);
  const totalChars = chunks.reduce((s, c) => s + c.metadata.char_count, 0);
  const govChars = govChunks.reduce((s, c) => s + c.metadata.char_count, 0);

  return {
    governance_chunk_count: govChunks.length,
    governance_char_pct: totalChars > 0 ? Math.round((govChars / totalChars) * 1000) / 10 : 0,
    governance_files: [...new Set(govChunks.map(c => c.metadata.source_file))],
    avg_gov_chunk_size: govChunks.length > 0
      ? Math.round(govChars / govChunks.length)
      : 0,
  };
}

/**
 * Validate chunk quality against targets
 * @returns {{passed: boolean, issues: string[], score: number}}
 */
export function validateChunkQuality(stats) {
  const issues = [];
  let score = 100;

  // Header-only check (CRITICAL)
  if (stats.header_only > 0) {
    issues.push(`CRITICAL: header_only_chunks = ${stats.header_only} (target: 0)`);
    score -= 30;
  }

  // Average size
  if (stats.avg_chars < 400) {
    issues.push(`avg_chars = ${stats.avg_chars} (target: >= 500)`);
    score -= 15;
  } else if (stats.avg_chars < 500) {
    issues.push(`WARN: avg_chars = ${stats.avg_chars} (target: >= 500)`);
    score -= 5;
  }

  // Tiny chunk percentage
  if (stats.tiny_pct > MAX_TINY_CHUNK_PCT) {
    issues.push(`tiny_chunk_pct = ${stats.tiny_pct}% (target: <= ${MAX_TINY_CHUNK_PCT}%)`);
    score -= 20;
  }

  // Governance coverage
  if (stats.governance_chunks < 1) {
    issues.push(`governance_chunks = ${stats.governance_chunks} (target: >= 1)`);
    score -= 10;
  }

  // Header-dominated
  if (stats.header_dominated > stats.total_chunks * 0.10) {
    issues.push(`header_dominated = ${stats.header_dominated} (> 10% of total)`);
    score -= 10;
  }

  // Body content ratio
  const bodyRatio = stats.total_chunks > 0
    ? stats.body_chars_total / Math.max(stats.total_chars, 1)
    : 0;
  if (bodyRatio < 0.5) {
    issues.push(`body_char_ratio = ${(bodyRatio * 100).toFixed(1)}% (target: >= 50%)`);
    score -= 10;
  }

  return {
    passed: issues.length === 0,
    issues,
    score: Math.max(0, score),
  };
}

export const ANALYZER_CONFIG = {
  TINY_CHUNK_THRESHOLD,
  HEADING_BODY_RATIO,
  TARGET_AVG_CHARS,
  MAX_TINY_CHUNK_PCT,
};
