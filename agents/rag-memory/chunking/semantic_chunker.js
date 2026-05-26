// ========================================
// v1.2.0 Phase B.2 — Semantic Chunker (v3)
// Complete rewrite: Section Accumulation + Merge + Quality
// ========================================
// Old strategy (v1/v2): headings emit chunks immediately → header-only fragments
// New strategy (v3):     accumulate body → target ~800 chars → emit coherent chunks
// ========================================

import { parseMarkdownSections } from './markdown_section_parser.js';
import { accumulateSections } from './section_accumulator.js';
import { mergeChunks } from './chunk_merger.js';
import { computeChunkStats, validateChunkQuality, chunkSizeDistribution, governanceCoverage } from './chunk_quality_analyzer.js';

// Re-export for backward compatibility
export { computeChunkStats, validateChunkQuality, chunkSizeDistribution, governanceCoverage };

/**
 * Main chunking function - v3: section accumulation strategy
 * @param {string} content - markdown content
 * @param {string} filePath - source file path for metadata
 * @returns {Array<Object>} - quality chunks with metadata
 */
export function chunkBySections(content, filePath) {
  // Step 1: Parse markdown into sections
  const sections = parseMarkdownSections(content);

  // Step 2: Accumulate sections into coherent chunks
  const accumulatedChunks = accumulateSections(sections, filePath);

  // Step 3: Merge tiny/heading-only chunks
  const mergedChunks = mergeChunks(accumulatedChunks);

  return mergedChunks;
}

// ---- Legacy exports for compatibility ----
export const CHUNKING_CONSTANTS = {
  TARGET_ACCUMULATION_SIZE: 800,
  MIN_CHUNK_SIZE: 250,
  HARD_MAX_CHUNK_SIZE: 2000,
};
