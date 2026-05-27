// ========================================
// v1.3.0 Phase B.1 — Runtime Retrieval API
// Unified interface: retrieveContext(query, options)
// v1.2.0: RAG document retrieval
// v1.3.0: + persistent memory integration
// ========================================

import { retrievalPipeline } from './retrieval_pipeline.js';
import { formatResponse, buildMetadataHeader } from './retrieval_response_formatter.js';
import { buildPromptContext } from './build_prompt_context.js';
import { guardContext } from './context_guard.js';

// Lazy-loaded persistent memory store (optional — only loaded when includeMemory=true AND DATABASE_URL is set)
let _searchMemory = null;
let _recordRetrieval = null;
let _memoryStoreAvailable = false;
let _memoryStoreChecked = false;

async function ensureMemoryStore() {
  if (_memoryStoreChecked) return _memoryStoreAvailable;
  _memoryStoreChecked = true;
  try {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      console.log('[retrieveContext] Persistent memory store unavailable: DATABASE_URL not set');
      return false;
    }
    const ms = await import('../../memory-store/memory_store.js');
    _searchMemory = ms.searchMemory;
    _recordRetrieval = ms.recordRetrieval;
    _memoryStoreAvailable = true;
    console.log('[retrieveContext] Persistent memory store loaded');
    return true;
  } catch (err) {
    console.log('[retrieveContext] Persistent memory store unavailable:', err.message);
    return false;
  }
}

/**
 * Unified retrieval function for agent runtime
 * 
 * @param {string} query - Natural language query
 * @param {object} options - Retrieval options
 * @param {string} options.mode - "keyword" | "semantic" | "hybrid" (default: "hybrid")
 * @param {number} options.topK - Number of results (default: 5)
 * @param {boolean} options.requireGovernance - Force governance enforcement (default: false)
 * @param {boolean} options.explain - Include explanation (default: false)
 * @param {boolean} options.includeMetadata - Include chunk metadata (default: true)
 * @param {boolean} options.includeScores - Include similarity scores (default: true)
 * @param {number} options.maxContextChars - Max chars for context string (default: 8000)
 * @param {string} options.agentName - Agent name for logging (default: "unknown")
 * @param {string} options.format - Output format: "json" | "compact" | "prompt" | "summary" (default: "json")
 * @param {boolean} options.includeMemory - Include persistent memory search results (default: false)
 * @param {number} options.memoryTopK - Number of memory results (default: 3)
 * @param {boolean} options.recordRetrieval - Audit retrieval to persistent store (default: false)
 * @returns {Promise<object>} Retrieval response
 */
async function retrieveContext(query, options = {}) {
  // Validate inputs
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string');
  }

  // Normalize options
  const opts = {
    mode: options.mode || 'hybrid',
    topK: Math.min(Math.max(options.topK || 5, 1), 20),
    requireGovernance: options.requireGovernance || false,
    explain: options.explain || false,
    includeMetadata: options.includeMetadata !== false,
    includeScores: options.includeScores !== false,
    maxContextChars: options.maxContextChars || 8000,
    agentName: options.agentName || 'unknown',
    format: options.format || 'json',
    includeMemory: options.includeMemory || false,
    memoryTopK: Math.min(Math.max(options.memoryTopK || 3, 1), 10),
    recordRetrieval: options.recordRetrieval || false,
  };

  // Validate mode
  if (!['keyword', 'semantic', 'hybrid'].includes(opts.mode)) {
    throw new Error(`Invalid mode: ${opts.mode}. Must be one of: keyword, semantic, hybrid`);
  }

  console.log(`[retrieveContext] Query: "${query}" (mode=${opts.mode}, topK=${opts.topK}, agent=${opts.agentName}, includeMemory=${opts.includeMemory})`);

  // Run retrieval pipeline (RAG documents)
  const response = await retrievalPipeline(query, opts);

  // Mark document chunks with source_type
  if (response.chunks) {
    for (const chunk of response.chunks) {
      chunk.source_type = 'document';
    }
  }

  // ── v1.3.0: Persistent memory search ──
  let memoryChunks = [];
  if (opts.includeMemory) {
    const memAvailable = await ensureMemoryStore();
    if (memAvailable) {
      try {
        const memResults = await _searchMemory(query, {
          agentName: opts.agentName,
          limit: opts.memoryTopK,
          mode: 'keyword',
          minSimilarity: 0.1,
        });

        memoryChunks = memResults.map(r => ({
          path: `memory://${r.memory.agentName}/${r.memory.id}`,
          content: r.memory.content,
          sectionTitle: r.memory.title,
          similarity: r.similarity,
          hybridScore: r.similarity,
          keywordScore: r.similarity,
          isGovernanceDoc: r.memory.memoryType === 'governance',
          isHardConstraintDoc: r.memory.memoryType === 'governance',
          snippet: (r.memory.content || '').slice(0, 200),
          source_type: 'memory',
          metadata: {
            memoryId: r.memory.id,
            memoryType: r.memory.memoryType,
            agentName: r.memory.agentName,
            importance: r.memory.importance,
            confidence: r.memory.confidence,
            tags: r.memory.tags,
          },
        }));

        console.log(`[retrieveContext] Memory search: ${memoryChunks.length} results`);
      } catch (err) {
        console.warn('[retrieveContext] Memory search failed:', err.message);
      }
    }
  }

  // Merge memory chunks into response — governance first, then by similarity
  if (memoryChunks.length > 0) {
    memoryChunks.sort((a, b) => {
      if (a.isGovernanceDoc && !b.isGovernanceDoc) return -1;
      if (!a.isGovernanceDoc && b.isGovernanceDoc) return 1;
      return (b.hybridScore || 0) - (a.hybridScore || 0);
    });

    // Append memory chunks after document chunks
    response.chunks = [...response.chunks, ...memoryChunks];
    response.top_k = response.chunks.length;
    response.memory_results = memoryChunks.length;
  }

  // Build prompt-ready context (now includes memory sections)
  response.context = buildPromptContext(response, { maxChars: opts.maxContextChars });

  // Guard context for secrets
  const guarded = guardContext(response);
  response.context = guarded.context;
  response.violations = guarded.violations;

  // ── v1.3.0: Audit retrieval ──
  if (opts.recordRetrieval) {
    const memAvailable = await ensureMemoryStore();
    if (memAvailable) {
      try {
        const memoryIds = memoryChunks.map(c => c.metadata?.memoryId).filter(Boolean);
        const docPaths = response.chunks.filter(c => c.source_type === 'document').map(c => c.path);
        const totalLatency = (response.metrics?.latency_ms || 0);

        await _recordRetrieval({
          queryText: query,
          mode: opts.mode,
          topK: opts.topK,
          retrievedMemoryIds: memoryIds.length > 0 ? memoryIds : null,
          retrievedDocPaths: docPaths.length > 0 ? docPaths : null,
          agentName: opts.agentName,
          latencyMs: totalLatency,
          cacheHit: response.metrics?.cache_hit || false,
          contextSizeChars: response.context?.length || 0,
          governanceViolations: response.violations || 0,
        });
      } catch (err) {
        console.warn('[retrieveContext] Retrieval audit failed:', err.message);
      }
    }
  }

  // Add metadata header
  response._meta = buildMetadataHeader(response);

  // Format output if requested
  if (opts.format !== 'json') {
    return formatResponse(response, { format: opts.format });
  }

  return response;
}

/**
 * Quick retrieval with defaults
 */
async function quickRetrieve(query) {
  return retrieveContext(query, { mode: 'hybrid', topK: 5 });
}

/**
 * Governance-aware retrieval
 */
async function governanceRetrieve(query, options = {}) {
  return retrieveContext(query, {
    ...options,
    mode: options.mode || 'hybrid',
    requireGovernance: true,
  });
}

// CLI mode
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const query = process.argv[2] || 'Five Iron Laws';
  const format = process.argv[3] || 'json';
  
  try {
    const result = await retrieveContext(query, { format });
    
    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(result);
    }

    // Close pool after CLI usage
    const { closePool } = await import('../vector_store.js');
    await closePool();
    process.exit(0);
  } catch (err) {
    console.error('[retrieveContext] Error:', err.message);
    process.exit(1);
  }
}

export { retrieveContext, quickRetrieve, governanceRetrieve };
