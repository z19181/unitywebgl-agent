/**
 * Retrieval Types — Type definitions for runtime retrieval API
 */

/**
 * @typedef {Object} RetrievalOptions
 * @property {string} mode - "keyword" | "semantic" | "hybrid"
 * @property {number} topK - Number of results (default: 5)
 * @property {boolean} requireGovernance - Force governance enforcement (default: false)
 * @property {boolean} explain - Include explanation (default: false)
 * @property {boolean} includeMetadata - Include chunk metadata (default: true)
 * @property {boolean} includeScores - Include similarity scores (default: true)
 * @property {number} maxContextChars - Max chars for context string (default: 8000)
 * @property {string} agentName - Agent name for logging/metrics (default: "unknown")
 */

/**
 * @typedef {Object} RetrievalChunk
 * @property {string} path - Document path
 * @property {string} content - Chunk content
 * @property {string} sectionTitle - Section title
 * @property {number} similarity - Semantic similarity score
 * @property {number} hybridScore - Hybrid score
 * @property {number} keywordScore - Keyword score
 * @property {boolean} isGovernanceDoc - Is governance document
 * @property {boolean} isHardConstraintDoc - Is hard constraint document
 * @property {string} snippet - Short snippet for display
 * @property {Object} metadata - Chunk metadata (optional)
 */

/**
 * @typedef {Object} RetrievalResponse
 * @property {string} query - Original query
 * @property {string} mode - Retrieval mode used
 * @property {string} retrieval_hash - Hash for caching
 * @property {number} top_k - Number of results returned
 * @property {Array<RetrievalChunk>} chunks - Retrieved chunks
 * @property {string} context - Prompt-ready context string
 * @property {boolean} governance_enforced - Was governance enforced
 * @property {number} violations - Number of violations detected
 * @property {Object} metrics - Retrieval metrics (latency, cache, etc.)
 * @property {Object} [explanation] - Explainability (if explain=true)
 */

/**
 * @typedef {Object} RetrievalMetrics
 * @property {number} latency_ms - Total retrieval latency
 * @property {boolean} cache_hit - Was this a cache hit
 * @property {number} cache_latency_ms - Cache lookup latency
 * @property {number} semantic_latency_ms - Semantic search latency
 * @property {number} keyword_latency_ms - Keyword search latency
 * @property {number} governance_latency_ms - Governance enforcement latency
 * @property {number} num_candidates - Number of candidates considered
 * @property {number} num_blocked - Number of results blocked
 * @property {string} embedding_provider - Embedding provider used
 * @property {number} embedding_dims - Embedding dimensions
 */

export { };
