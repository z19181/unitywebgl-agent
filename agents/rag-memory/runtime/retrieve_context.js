// ========================================
// v1.2.0 Phase C — Runtime Retrieval API
// Unified interface: retrieveContext(query, options)
// ========================================

import { retrievalPipeline } from './retrieval_pipeline.js';
import { formatResponse, buildMetadataHeader } from './retrieval_response_formatter.js';
import { buildPromptContext } from './build_prompt_context.js';
import { guardContext } from './context_guard.js';

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
  };

  // Validate mode
  if (!['keyword', 'semantic', 'hybrid'].includes(opts.mode)) {
    throw new Error(`Invalid mode: ${opts.mode}. Must be one of: keyword, semantic, hybrid`);
  }

  console.log(`[retrieveContext] Query: "${query}" (mode=${opts.mode}, topK=${opts.topK}, agent=${opts.agentName})`);

  // Run retrieval pipeline
  const response = await retrievalPipeline(query, opts);

  // Build prompt-ready context
  response.context = buildPromptContext(response, { maxChars: opts.maxContextChars });

  // Guard context for secrets
  const guarded = guardContext(response);
  response.context = guarded.context;
  response.violations = guarded.violations;

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
