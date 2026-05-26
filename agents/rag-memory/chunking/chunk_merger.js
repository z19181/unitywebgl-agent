// ========================================
// v1.2.0 Phase B.2 — Chunk Merger
// Post-processing: merge tiny chunks
// ========================================
// Rules:
//   1. < 250 chars → merge with largest neighbor
//   2. Heading-only (body < 50 chars of actual content) → always merge
//   3. Adjacent governance chunks → merge together
//   4. After merging, re-split if > HARD_MAX (except governance)
// ========================================

const MIN_CHUNK_SIZE = 250;
const MIN_BODY_CHARS = 50;        // threshold for "heading-only"
const HARD_MAX_SIZE = 2000;
const GOVERNANCE_MAX_SIZE = 3000;  // governance gets more room

function isGovernanceChunk(chunk) {
  return !!(chunk.metadata && chunk.metadata.is_governance);
}

function isTinyChunk(chunk) {
  return chunk.metadata.char_count < MIN_CHUNK_SIZE;
}

function isHeadingOnly(chunk) {
  // Extract body (everything after last heading)
  const content = chunk.content;
  const headingEnd = content.lastIndexOf('\n\n');
  const body = headingEnd >= 0 ? content.slice(headingEnd).trim() : content.trim();
  return body.length < MIN_BODY_CHARS;
}

/**
 * Merge adjacent governance chunks into one
 */
function mergeGovernanceNeighbors(chunks) {
  const result = [];
  let i = 0;

  while (i < chunks.length) {
    const current = chunks[i];

    if (isGovernanceChunk(current)) {
      // Collect all consecutive governance chunks
      let mergedContent = current.content;
      let mergedSections = [...(current.metadata.heading_path || [])];
      let totalChars = current.metadata.char_count;
      let j = i + 1;

      while (j < chunks.length && isGovernanceChunk(chunks[j])) {
        mergedContent += '\n\n' + chunks[j].content;
        totalChars += chunks[j].metadata.char_count + 2;
        // Merge heading paths (take deepest)
        const nextHeadings = chunks[j].metadata.heading_path || [];
        mergedSections = [...new Set([...mergedSections, ...nextHeadings])];
        j++;
      }

      if (totalChars <= GOVERNANCE_MAX_SIZE) {
        result.push({
          content: mergedContent,
          metadata: {
            ...current.metadata,
            heading_path: mergedSections,
            char_count: totalChars,
            accumulation_count: j - i,
            merged_from: j - i,
          },
        });
      } else {
        // Too big even for governance — keep individual chunks
        for (let k = i; k < j; k++) result.push(chunks[k]);
      }

      i = j;
    } else {
      result.push(current);
      i++;
    }
  }

  return result;
}

/**
 * Merge tiny or heading-only chunks into neighbors
 */
function mergeTinyChunks(chunks) {
  if (chunks.length <= 1) return chunks;

  const result = [];
  let pending = null; // chunk waiting to be merged

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const needsMerge = isTinyChunk(chunk) || isHeadingOnly(chunk);

    if (needsMerge && chunk.metadata.is_governance) {
      // Governance tiny chunk: keep it (it's intentional)
      result.push(chunk);
      continue;
    }

    if (!needsMerge) {
      if (pending) {
        // Merge pending into this chunk (prepend content)
        const mergedContent = pending.content + '\n\n' + chunk.content;
        result.push({
          content: mergedContent,
          metadata: {
            ...chunk.metadata,
            heading_path: [
              ...(pending.metadata.heading_path || []),
              ...(chunk.metadata.heading_path || []),
            ],
            char_count: pending.metadata.char_count + chunk.metadata.char_count + 2,
            accumulation_count: (pending.metadata.accumulation_count || 1) + (chunk.metadata.accumulation_count || 1),
            merged_from: 2,
          },
        });
        pending = null;
      } else {
        result.push(chunk);
      }
    } else {
      // needsMerge: defer this chunk
      if (pending) {
        // Merge two tiny chunks together
        const mergedContent = pending.content + '\n\n' + chunk.content;
        const mergedChars = pending.metadata.char_count + chunk.metadata.char_count + 2;
        if (mergedChars < MIN_CHUNK_SIZE) {
          // Still too small — keep as pending for next neighbor
          pending = {
            content: mergedContent,
            metadata: {
              ...chunk.metadata,
              heading_path: [
                ...(pending.metadata.heading_path || []),
                ...(chunk.metadata.heading_path || []),
              ],
              char_count: mergedChars,
              accumulation_count: (pending.metadata.accumulation_count || 1) + (chunk.metadata.accumulation_count || 1),
              merged_from: 2,
            },
          };
        } else {
          // Now large enough — emit as merged chunk
          result.push({
            content: mergedContent,
            metadata: {
              ...chunk.metadata,
              heading_path: [
                ...(pending.metadata.heading_path || []),
                ...(chunk.metadata.heading_path || []),
              ],
              char_count: mergedChars,
              accumulation_count: (pending.metadata.accumulation_count || 1) + (chunk.metadata.accumulation_count || 1),
              merged_from: 2,
            },
          });
          pending = null;
        }
      } else {
        // First tiny chunk — defer
        pending = chunk;
      }
    }
  }

  // Flush any remaining pending chunk
  if (pending) {
    if (result.length > 0) {
      // Merge into last result
      const last = result[result.length - 1];
      result[result.length - 1] = {
        content: last.content + '\n\n' + pending.content,
        metadata: {
          ...last.metadata,
          heading_path: [
            ...(last.metadata.heading_path || []),
            ...(pending.metadata.heading_path || []),
          ],
          char_count: last.metadata.char_count + pending.metadata.char_count + 2,
          accumulation_count: (last.metadata.accumulation_count || 1) + (pending.metadata.accumulation_count || 1),
          merged_from: 2,
        },
      };
    } else {
      result.push(pending);
    }
  }

  return result;
}

/**
 * Re-split any merged chunk that exceeds HARD_MAX (non-governance only)
 */
function enforceMaxSize(chunks) {
  const result = [];

  for (const chunk of chunks) {
    if (chunk.metadata.char_count <= HARD_MAX_SIZE || isGovernanceChunk(chunk)) {
      result.push(chunk);
      continue;
    }

    // Split at paragraph boundaries
    const paragraphs = chunk.content.split('\n\n');
    let buf = [];
    let bufChars = 0;

    for (const para of paragraphs) {
      const pChars = para.length + 2;

      if (bufChars + pChars > HARD_MAX_SIZE && buf.length > 0 && bufChars >= MIN_CHUNK_SIZE) {
        result.push({
          content: buf.join('\n\n'),
          metadata: {
            ...chunk.metadata,
            char_count: bufChars,
            chunk_index: result.length,
          },
        });
        buf = [];
        bufChars = 0;
      }

      buf.push(para);
      bufChars += pChars;
    }

    if (buf.length > 0) {
      result.push({
        content: buf.join('\n\n'),
        metadata: {
          ...chunk.metadata,
          char_count: bufChars,
          chunk_index: result.length,
        },
      });
    }
  }

  // Re-index
  return result.map((c, i) => ({
    ...c,
    metadata: { ...c.metadata, chunk_index: i },
  }));
}

/**
 * Full merge pipeline
 */
export function mergeChunks(chunks) {
  if (!chunks || chunks.length === 0) return [];

  let result = mergeGovernanceNeighbors(chunks);
  result = mergeTinyChunks(result);
  result = enforceMaxSize(result);

  return result;
}

export const MERGER_CONFIG = {
  MIN_CHUNK_SIZE,
  MIN_BODY_CHARS,
  HARD_MAX_SIZE,
  GOVERNANCE_MAX_SIZE,
};
