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
  if (response.memory_results) {
    lines.push(`[Memory Results] ${response.memory_results}`);
  }
  lines.push('');

  // Sort chunks: governance first, then memory governance, then by score
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
  let docCount = 0;
  let memCount = 0;

  // Group by source type for section headers
  const docChunks = chunks.filter(c => c.source_type !== 'memory');
  const memoryChunks = chunks.filter(c => c.source_type === 'memory');

  // Document sources
  if (docChunks.length > 0) {
    lines.push('[Document Source]');
    for (let i = 0; i < docChunks.length; i++) {
      const chunk = docChunks[i];
      const section = buildChunkSection(chunk, docCount + 1, opts);
      const sectionChars = section.length;

      if (totalChars + sectionChars > opts.maxChars) {
        if (opts.truncateLongChunks && docCount === 0 && memCount === 0) {
          const truncated = truncateChunkSection(chunk, docCount + 1, opts.maxChars - totalChars - 50);
          if (truncated) { lines.push(truncated); totalChars += truncated.length; docCount++; }
        }
        break;
      }
      lines.push(section);
      totalChars += sectionChars;
      docCount++;
    }
    lines.push('');
  }

  // Memory sources (v1.3.0)
  if (memoryChunks.length > 0) {
    // Check if we still have room
    if (totalChars < opts.maxChars) {
      lines.push('[Memory Source]');
      for (let i = 0; i < memoryChunks.length; i++) {
        const chunk = memoryChunks[i];
        const section = buildMemoryChunkSection(chunk, memCount + 1, opts);
        const sectionChars = section.length;

        if (totalChars + sectionChars > opts.maxChars) {
          if (opts.truncateLongChunks && docCount === 0 && memCount === 0) {
            const truncated = truncateMemoryChunkSection(chunk, memCount + 1, opts.maxChars - totalChars - 50);
            if (truncated) { lines.push(truncated); totalChars += truncated.length; memCount++; }
          }
          break;
        }
        lines.push(section);
        totalChars += sectionChars;
        memCount++;
      }
      lines.push('');
    }
  }

  // Footer
  lines.push('=== RETRIEVED CONTEXT END ===');
  const includedCount = docCount + memCount;
  lines.push(`[Documents Included] ${docCount}/${docChunks.length}`);
  if (memoryChunks.length > 0) {
    lines.push(`[Memories Included] ${memCount}/${memoryChunks.length}`);
  }
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

/**
 * Build a single memory chunk section (v1.3.0 Phase B.1)
 */
function buildMemoryChunkSection(chunk, index, opts) {
  const marker = chunk.isHardConstraintDoc ? '🧠🛡️' : '🧠';
  const memType = chunk.metadata?.memoryType || 'unknown';
  const importance = chunk.metadata?.importance || '—';
  
  const lines = [];
  
  lines.push(`--- Memory ${index} ${marker} [${memType}] ---`);
  lines.push(`[Title] ${chunk.sectionTitle || '(untitled)'}`);
  lines.push(`[Importance] ${importance}/10`);
  
  if (chunk.metadata?.agentName) {
    lines.push(`[Agent] ${chunk.metadata.agentName}`);
  }

  lines.push(`[Content]`);
  lines.push(chunk.content);
  
  if (opts.includeSourceMarkers && chunk.hybridScore !== undefined) {
    lines.push(`[Relevance] ${(chunk.hybridScore * 100).toFixed(1)}%`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Truncate a memory chunk section to fit within character limit (v1.3.0)
 */
function truncateMemoryChunkSection(chunk, index, maxChars) {
  const marker = chunk.isHardConstraintDoc ? '🧠🛡️' : '🧠';
  const memType = chunk.metadata?.memoryType || 'unknown';
  
  const header = `--- Memory ${index} ${marker} [${memType}] ---\n[Title] ${chunk.sectionTitle || '(untitled)'}\n[Content]\n`;
  const footer = '\n[Truncated] ...\n';
  const availableChars = maxChars - header.length - footer.length;

  if (availableChars <= 0) return null;

  const truncatedContent = chunk.content.slice(0, availableChars);
  
  return `${header}${truncatedContent}${footer}`;
}

export { buildPromptContext, buildMinimalContext, deduplicateChunks, truncateChunkSection, buildMemoryChunkSection, truncateMemoryChunkSection };
