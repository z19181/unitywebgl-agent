// ========================================
// Semantic Chunker for Markdown Documents
// v1.2.0 Phase B.1 — Fix Semantic Chunking
// ========================================
// Key fix: headers must NOT create header-only chunks
// - Header accumulates subsequent body content
// - Flush only when next heading at same/higher level appears
// - Preserve hard constraint sections even if short
// ========================================

import { parseMarkdownSections } from './markdown_section_parser.js';

const TARGET_CHUNK_SIZE = 1000;      // 800-1500 target range, aim for 1000
const HARD_MAX_CHUNK_SIZE = 2200;    // absolute maximum
const MIN_CHUNK_SIZE = 100;          // minimum meaningful chunk (except hard constraints)
const CHUNK_OVERLAP = 200;           // overlap when splitting large sections

// Hard constraint keywords that must NOT be filtered
const HARD_CONSTRAINT_KEYWORDS = [
  'server.js',
  'RELEASE_STATE.json',
  'game_message.type',
  'playerIndex',
  'Git tag',
  'Five Iron Laws',
  '五条铁律',
  '不可修改',
  'prohibited',
  'blocked',
];

// Governance keywords (important but not as critical as hard constraints)
const GOVERNANCE_KEYWORDS = [
  'governance',
  'policy',
  'constraint',
  'rule',
  'protocol',
  'architecture',
  '治理',
  '约束',
];

/**
 * Check if content contains hard constraint keywords
 */
function containsHardConstraint(content) {
  const lower = content.toLowerCase();
  return HARD_CONSTRAINT_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Check if content contains governance keywords
 */
function containsGovernance(content) {
  const lower = content.toLowerCase();
  return GOVERNANCE_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
}

/**
 * Estimate token count from character count
 * Rough heuristic: ~4 chars per token for English, ~2 for Chinese
 */
function estimateTokens(charCount, content) {
  // Detect if content has significant Chinese
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  const ratio = chineseChars > charCount * 0.3 ? 2 : 4;
  return Math.ceil(charCount / ratio);
}

/**
 * Smart split for large chunks - preserves code blocks
 * @param {string} content - content to split
 * @param {number} maxSize - maximum chunk size
 * @param {number} overlap - overlap between chunks
 * @returns {Array<{content: string, charCount: number}>}
 */
function smartSplit(content, maxSize = HARD_MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  if (content.length <= maxSize) {
    return [{ content, charCount: content.length }];
  }

  const chunks = [];
  const lines = content.split('\n');
  let currentChunkLines = [];
  let currentSize = 0;
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLen = line.length + 1; // +1 for newline

    // Track code block boundaries
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }

    // Check if adding this line would exceed max
    if (currentSize + lineLen > maxSize && currentChunkLines.length > 0 && !inCodeBlock) {
      // Flush current chunk (NOT inside code block)
      const chunkContent = currentChunkLines.join('\n');
      chunks.push({ content: chunkContent, charCount: chunkContent.length });

      // Start new chunk with overlap
      const overlapLines = currentChunkLines.slice(-Math.ceil(overlap / 80)); // ~80 chars per line
      currentChunkLines = [...overlapLines];
      currentSize = overlapLines.reduce((sum, l) => sum + l.length + 1, 0);
    }

    currentChunkLines.push(line);
    currentSize += lineLen;
  }

  // Flush remaining
  if (currentChunkLines.length > 0) {
    const chunkContent = currentChunkLines.join('\n');
    chunks.push({ content: chunkContent, charCount: chunkContent.length });
  }

  return chunks;
}

/**
 * Main chunking function - creates semantic chunks from markdown
 * @param {string} content - markdown content
 * @param {string} filePath - source file path for metadata
 * @returns {Array<Object>} - array of chunk objects with metadata
 */
export function chunkBySections(content, filePath) {
  const sections = parseMarkdownSections(content);
  const chunks = [];
  let chunkIndex = 0;

  for (const section of sections) {
    // Skip completely empty sections (no heading, no body)
    if (!section.heading && section.body.trim().length === 0) {
      continue;
    }

    // Build chunk content: include heading hierarchy + body
    const headingPrefix = section.headingPath.map(h => h.text).join('\n');
    const fullContent = headingPrefix.length > 0 
      ? `${headingPrefix}\n\n${section.body}` 
      : section.body;

    const charCount = fullContent.length;
    const hasBody = section.body.trim().length > 0;
    const isHardConstraint = containsHardConstraint(fullContent);
    const isGovernance = containsGovernance(fullContent);

    // Skip header-only chunks (unless hard constraint)
    if (!hasBody && charCount < MIN_CHUNK_SIZE && !isHardConstraint) {
      // This is a tiny header-only chunk - skip it
      // It will be merged with parent/adjacent section in the parser
      continue;
    }

    // If chunk is too large, smart split it
    if (charCount > HARD_MAX_CHUNK_SIZE) {
      const splitParts = smartSplit(fullContent);
      for (const part of splitParts) {
        chunks.push({
          content: part.content,
          metadata: {
            source_file: filePath,
            heading_path: section.headingPath.map(h => h.text),
            heading_level: section.level,
            chunk_index: chunkIndex++,
            char_count: part.charCount,
            token_estimate: estimateTokens(part.charCount, part.content),
            is_governance: containsGovernance(part.content),
            is_hard_constraint: containsHardConstraint(part.content),
            has_body: part.content.trim().length > section.headingPath.map(h => h.text).join('\n').length,
          },
        });
      }
    } else {
      chunks.push({
        content: fullContent,
        metadata: {
          source_file: filePath,
          heading_path: section.headingPath.map(h => h.text),
          heading_level: section.level,
          chunk_index: chunkIndex++,
          char_count: charCount,
          token_estimate: estimateTokens(charCount, fullContent),
          is_governance: isGovernance,
          is_hard_constraint: isHardConstraint,
          has_body: hasBody,
        },
      });
    }
  }

  return chunks;
}

/**
 * Compute chunk statistics for quality check
 * @param {Array<Object>} chunks - array of chunk objects
 * @returns {Object} - statistics object
 */
export function computeChunkStats(chunks) {
  const charCounts = chunks.map(c => c.metadata.char_count);
  const headerOnlyCount = chunks.filter(c => !c.metadata.has_body).length;
  const tinyCount = chunks.filter(c => c.metadata.char_count < 80).length;
  const hugeCount = chunks.filter(c => c.metadata.char_count > HARD_MAX_CHUNK_SIZE).length;
  const hardConstraintCount = chunks.filter(c => c.metadata.is_hard_constraint).length;
  const governanceCount = chunks.filter(c => c.metadata.is_governance).length;

  const avgChars = charCounts.length > 0 
    ? Math.round(charCounts.reduce((a, b) => a + b, 0) / charCounts.length) 
    : 0;

  const medianChars = charCounts.length > 0 
    ? charCounts.sort((a, b) => a - b)[Math.floor(charCounts.length / 2)] 
    : 0;

  return {
    total_chunks: chunks.length,
    header_only_chunks: headerOnlyCount,
    avg_chunk_chars: avgChars,
    median_chunk_chars: medianChars,
    chunks_under_80: tinyCount,
    chunks_over_2200: hugeCount,
    hard_constraint_chunks: hardConstraintCount,
    governance_chunks: governanceCount,
    min_chunk_chars: charCounts.length > 0 ? Math.min(...charCounts) : 0,
    max_chunk_chars: charCounts.length > 0 ? Math.max(...charCounts) : 0,
  };
}

/**
 * Validate chunk quality against targets
 * @param {Object} stats - chunk statistics
 * @returns {{passed: boolean, issues: Array<string>}}
 */
export function validateChunkQuality(stats) {
  const issues = [];

  if (stats.header_only_chunks > 0) {
    issues.push(`header_only_chunks = ${stats.header_only_chunks} (target: 0)`);
  }

  if (stats.chunks_under_80 > stats.total_chunks * 0.05) {
    issues.push(`chunks_under_80 = ${stats.chunks_under_80} (> 5% of total)`);
  }

  if (stats.avg_chunk_chars < 300) {
    issues.push(`avg_chunk_chars = ${stats.avg_chunk_chars} (target: >= 300)`);
  }

  if (stats.hard_constraint_chunks < 1) {
    issues.push(`hard_constraint_chunks = ${stats.hard_constraint_chunks} (target: >= 1)`);
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

// Export constants for testing
export const CHUNKING_CONSTANTS = {
  TARGET_CHUNK_SIZE,
  HARD_MAX_CHUNK_SIZE,
  MIN_CHUNK_SIZE,
  CHUNK_OVERLAP,
  HARD_CONSTRAINT_KEYWORDS,
  GOVERNANCE_KEYWORDS,
};