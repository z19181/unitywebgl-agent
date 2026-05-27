// ========================================
// v1.2.0 Phase C — Prompt Context Builder
// Builds LLM-safe prompt context from retrieval results
// ========================================

/**
 * Build prompt-ready context from retrieval response
 * 
 * @param {object} response - Retrieval response from retrieveContext()
 * @param {object} options - Build options
 * @param {number} options.maxChars - Max total characters (default: 8000)
 * @param {boolean} options.includeGovernanceFirst - Put governance docs first (default: true)
 * @param {boolean} options.includeSourceMarkers - Include source markers (default: true)
 * @param {boolean} options.truncateLongChunks - Truncate chunks that are too long (default: true)
 * @returns {string} Prompt-ready context string
 */
function buildPromptContext(response, options = {}) {
  const opts = {
    maxChars: options.maxChars || 8000,
    includeGovernanceFirst: options.includeGovernanceFirst !== false,
    includeSourceMarkers: options.includeSourceMarkers !== false,
    truncateLongChunks: options.truncateLongChunks !== false,
  };

  const lines = [];
  
  // Header
  lines.push('=== RETRIEVED CONTEXT START ===');
  lines.push(`[Query] ${response.query}`);
  lines.push(`[Mode] ${response.mode}`);
  lines.push(`[Governance Enforced] ${response.governance_enforced ? 'Yes' : 'No'}`);
  lines.push(`[Retrieval Hash] ${response.retrieval_hash}`);
  lines.push('');

  // Sort chunks: governance first
  let chunks = [...response.chunks];
  if (opts.includeGovernanceFirst) {
    chunks.sort((a, b) => {
      if (a.isHardConstraintDoc && !b.isHardConstraintDoc) return -1;
      if (!a.isHardConstraintDoc && b.isHardConstraintDoc) return 1;
      if (a.isGovernanceDoc && !b.isGovernanceDoc) return -1;
      if (!a.isGovernanceDoc && b.isGovernanceDoc) return 1;
      return (b.hybridScore || 0) - (a.hybridScore || 0);
    });
  }

  // Build context sections
  let totalChars = 0;
  let includedCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const section = buildChunkSection(chunk, i + 1, opts);
    const sectionChars = section.length;

    // Check if adding this section would exceed maxChars
    if (totalChars + sectionChars > opts.maxChars) {
      // Try to add at least a truncated version
      if (opts.truncateLongChunks && includedCount === 0) {
        const truncated = truncateChunkSection(chunk, i + 1, opts.maxChars - totalChars - 50);
        if (truncated) {
          lines.push(truncated);
          totalChars += truncated.length;
          includedCount++;
        }
      }
      break;
    }

    lines.push(section);
    totalChars += sectionChars;
    includedCount++;
  }

  // Footer
  lines.push('');
  lines.push('=== RETRIEVED CONTEXT END ===');
  lines.push(`[Total Chunks Included] ${includedCount}/${response.top_k}`);
  lines.push(`[Total Characters] ${totalChars}`);

  return lines.join('\n');
}

/**
 * Build a single chunk section
 */
function buildChunkSection(chunk, index, opts) {
  const marker = chunk.isHardConstraintDoc ? '🛡️' : 
                 chunk.isGovernanceDoc ? '⚖️' : '📄';
  
  const lines = [];
  
  lines.push(`--- Source ${index} ${marker} ---`);
  lines.push(`[Path] ${chunk.path}`);
  
  if (chunk.sectionTitle) {
    lines.push(`[Heading] ${chunk.sectionTitle}`);
  }

  lines.push(`[Content]`);
  lines.push(chunk.content);
  
  if (opts.includeSourceMarkers && chunk.hybridScore !== undefined) {
    lines.push(`[Score] ${(chunk.hybridScore * 100).toFixed(1)}%`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Truncate a chunk section to fit within character limit
 */
function truncateChunkSection(chunk, index, maxChars) {
  const marker = chunk.isHardConstraintDoc ? '🛡️' : 
                 chunk.isGovernanceDoc ? '⚖️' : '📄';
  
  // Calculate header size
  const header = `--- Source ${index} ${marker} ---\n[Path] ${chunk.path}\n[Content]\n`;
  const footer = '\n[Truncated] ...\n';
  const availableChars = maxChars - header.length - footer.length;

  if (availableChars <= 0) return null;

  const truncatedContent = chunk.content.slice(0, availableChars);
  
  return `${header}${truncatedContent}${footer}`;
}

/**
 * Build minimal context (just content, no markers)
 */
function buildMinimalContext(response, options = {}) {
  const { maxChars = 4000, includeGovernanceFirst = true } = options;
  
  let chunks = [...response.chunks];
  
  if (includeGovernanceFirst) {
    chunks.sort((a, b) => {
      if (a.isHardConstraintDoc && !b.isHardConstraintDoc) return -1;
      if (!a.isHardConstraintDoc && b.isHardConstraintDoc) return 1;
      return (b.hybridScore || 0) - (a.hybridScore || 0);
    });
  }

  const sections = [];
  let totalChars = 0;

  for (const chunk of chunks) {
    const content = chunk.content + '\n\n';
    if (totalChars + content.length > maxChars) break;
    sections.push(content);
    totalChars += content.length;
  }

  return sections.join('').trim();
}

/**
 * Deduplicate overlapping content between chunks
 */
function deduplicateChunks(chunks) {
  const seen = new Set();
  const deduped = [];

  for (const chunk of chunks) {
    // Create a simple hash of content (first 100 chars + length)
    const contentHash = `${chunk.content.slice(0, 100).trim()}|${chunk.content.length}`;
    
    if (!seen.has(contentHash)) {
      seen.add(contentHash);
      deduped.push(chunk);
    }
  }

  return deduped;
}

export { buildPromptContext, buildMinimalContext, deduplicateChunks, truncateChunkSection };
