// ========================================
// v1.2.0 Phase B.2 — Section Accumulator
// Chunk Reconstruction Core Engine
// ========================================
// Strategy: heading = metadata, not a chunk
//   - Accumulate body across sections until target size
//   - Never emit body-less chunks (even governance)
//   - Governance sections: whole preservation, no splitting
//   - Adjacent tiny sections merge into parent
// ========================================

import { parseMarkdownSections, headingPathToString } from './markdown_section_parser.js';

// ---- Configuration ----
const TARGET_ACCUMULATION_SIZE = 800;    // aim for ~800 chars before emitting
const MIN_CHUNK_SIZE = 250;              // hard minimum: never emit smaller
const HARD_MAX_SIZE = 2000;              // absolute maximum (governance exempt)
const BUFFER_OVERLAP_KEEP = 200;         // chars from previous chunk kept as context

// ---- Governance Detection ----
const GOVERNANCE_PATTERNS = [
  /server\s*\.\s*js/i,
  /RELEASE_STATE\s*\.\s*json/i,
  /game_message\s*\.\s*type/i,
  /playerIndex/i,
  /Five\s+Iron\s+Laws/i,
  /五条铁律/,
  /git\s+tag/i,
  /protocol/,
  /governance/,
  /release\s+gate/,
  /architecture\s+invariant/,
];

function detectGovernance(text) {
  return GOVERNANCE_PATTERNS.some(p => p.test(text));
}

function estimateTokens(chars, text) {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return Math.ceil(chars / (chineseChars > chars * 0.3 ? 2 : 4));
}

/**
 * Smart split: break large content at natural boundaries
 * Respects: paragraph breaks, list item boundaries, code blocks
 */
function smartSplitLines(lines, maxChars) {
  const chunks = [];
  let buf = [];
  let bufChars = 0;
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) inCodeBlock = !inCodeBlock;
    const lineChars = line.length + 1;

    if (bufChars + lineChars > maxChars && buf.length > 0 && !inCodeBlock && bufChars >= 300) {
      chunks.push(buf.join('\n'));
      // Keep last few lines as overlap context
      const overlapStart = Math.max(0, buf.length - Math.ceil(BUFFER_OVERLAP_KEEP / 80));
      buf = buf.slice(overlapStart);
      bufChars = buf.reduce((s, l) => s + l.length + 1, 0);
    }

    buf.push(line);
    bufChars += lineChars;
  }

  if (buf.length > 0) chunks.push(buf.join('\n'));
  return chunks;
}

/**
 * Accumulate sections into quality chunks.
 *
 * @param {Array} sections - from parseMarkdownSections()
 * @param {string} filePath - source file for metadata
 * @returns {Array<Object>} - chunks with content + metadata
 */
export function accumulateSections(sections, filePath) {
  if (!sections || sections.length === 0) return [];

  const chunks = [];
  let chunkIndex = 0;

  // ---- State ----
  let buffer = {
    headingPath: [],        // accumulated heading hierarchy
    sections: [],           // accumulated section data
    bodyLines: [],          // all body lines
    charCount: 0,           // total chars
    isGovernance: false,    // governance content detected
    startHeading: null,     // first heading in this chunk
  };

  function flushBuffer() {
    if (buffer.bodyLines.length === 0) return;

    const bodyText = buffer.bodyLines.join('\n').trim();
    if (bodyText.length === 0) return;

    // Build full content: heading path + body
    const headingPrefix = buffer.headingPath.map(h => `#${'#'.repeat(h.level)} ${h.text}`).join(' > ');
    const fullContent = headingPrefix
      ? `## ${headingPrefix}\n\n${bodyText}`
      : bodyText;

    const charCount = fullContent.length;

    // For governance content: keep whole, mark specially
    if (buffer.isGovernance && charCount <= HARD_MAX_SIZE * 1.5) {
      chunks.push({
        content: fullContent,
        metadata: {
          source_file: filePath,
          heading_path: buffer.headingPath.map(h => h.text),
          heading_level: buffer.headingPath.length > 0
            ? buffer.headingPath[buffer.headingPath.length - 1].level
            : 0,
          chunk_index: chunkIndex++,
          char_count: charCount,
          token_estimate: estimateTokens(charCount, fullContent),
          is_governance: true,
          is_hard_constraint: true,
          has_body: true,
          accumulation_count: buffer.sections.length,
        },
      });
      return;
    }

    // For large non-governance chunks: smart-split
    if (charCount > HARD_MAX_SIZE) {
      const headingBlock = headingPrefix
        ? `## ${headingPrefix}\n`
        : '';
      const parts = smartSplitLines(buffer.bodyLines, HARD_MAX_SIZE - headingBlock.length);
      for (const part of parts) {
        const partContent = headingBlock + part;
        const pChars = partContent.length;
        if (pChars < MIN_CHUNK_SIZE) continue; // skip fragments
        chunks.push({
          content: partContent,
          metadata: {
            source_file: filePath,
            heading_path: buffer.headingPath.map(h => h.text),
            heading_level: buffer.headingPath.length > 0
              ? buffer.headingPath[buffer.headingPath.length - 1].level
              : 0,
            chunk_index: chunkIndex++,
            char_count: pChars,
            token_estimate: estimateTokens(pChars, partContent),
            is_governance: false,
            is_hard_constraint: false,
            has_body: true,
            accumulation_count: 1,
          },
        });
      }
      return;
    }

    // Normal chunk emission
    chunks.push({
      content: fullContent,
      metadata: {
        source_file: filePath,
        heading_path: buffer.headingPath.map(h => h.text),
        heading_level: buffer.headingPath.length > 0
          ? buffer.headingPath[buffer.headingPath.length - 1].level
          : 0,
        chunk_index: chunkIndex++,
        char_count: charCount,
        token_estimate: estimateTokens(charCount, fullContent),
        is_governance: buffer.isGovernance,
        is_hard_constraint: buffer.isGovernance,
        has_body: true,
        accumulation_count: buffer.sections.length,
      },
    });
  }

  function resetBuffer(keepHeadingPath = false) {
    const oldPath = keepHeadingPath ? [...buffer.headingPath] : [];
    buffer = {
      headingPath: oldPath,
      sections: [],
      bodyLines: [],
      charCount: 0,
      isGovernance: false,
      startHeading: oldPath.length > 0 ? oldPath[oldPath.length - 1].text : null,
    };
  }

  // ---- Main accumulation loop ----
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const body = section.body ? section.body.trim() : '';
    const bodyLen = body.length;
    const isGov = detectGovernance(body) || detectGovernance(section.heading || '');

    // Detect heading level change
    const currentLevel = section.level || 0;
    const bufferLevel = buffer.headingPath.length > 0
      ? buffer.headingPath[buffer.headingPath.length - 1].level
      : 0;

    // ---- NEW TOPIC DETECTION ----
    // Flush when: new heading at same/higher level (not deeper), AND buffer has content
    const isNewTopic =
      section.heading !== null &&
      currentLevel <= bufferLevel &&
      currentLevel > 0 &&
      buffer.charCount > 0;

    // ---- GOVERNANCE DETECTION ----
    // If we encounter governance after non-governance, flush first
    if (isGov && !buffer.isGovernance && buffer.charCount > 0) {
      flushBuffer();
      resetBuffer(false);
    }
    // If we switch from governance to non-governance, flush governance chunk
    if (!isGov && buffer.isGovernance && buffer.charCount > 0) {
      flushBuffer();
      resetBuffer(false);
    }

    // ---- HEADING HANDLING ----
    if (section.heading !== null) {
      // Update heading path
      while (buffer.headingPath.length > 0 &&
             buffer.headingPath[buffer.headingPath.length - 1].level >= currentLevel) {
        buffer.headingPath.pop();
      }
      // Add new heading to path (even if body is empty — it's context)
      buffer.headingPath.push({ level: currentLevel, text: section.heading });

      // If this is a new topic with accumulated content, flush
      if (isNewTopic) {
        flushBuffer();
        resetBuffer(true);
      }
    }

    // ---- BODY ACCUMULATION ----
    if (bodyLen > 0) {
      buffer.bodyLines.push(body);
      buffer.sections.push(section);
      buffer.charCount += bodyLen + 2; // +2 for newlines
      buffer.isGovernance = buffer.isGovernance || isGov;

      // ---- SIZE CHECK ----
      // Emit when we have enough content (and not in the middle of governance)
      if (buffer.charCount >= TARGET_ACCUMULATION_SIZE && !buffer.isGovernance) {
        flushBuffer();
        // Keep last heading for context in next chunk
        resetBuffer(true);
      }
    }
    // If body is empty: heading is accumulated as metadata only (no empty chunks)
  }

  // ---- FLUSH REMAINING ----
  flushBuffer();

  return chunks;
}

export const CONFIG = {
  TARGET_ACCUMULATION_SIZE,
  MIN_CHUNK_SIZE,
  HARD_MAX_SIZE,
};
