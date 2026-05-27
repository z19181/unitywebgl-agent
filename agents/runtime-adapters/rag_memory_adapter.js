// ========================================
// RAG Memory Agent Adapter
// Specialized retrieval for rag-memory agent
// ========================================

import { retrieveContext, governanceRetrieve } from '../rag-memory/runtime/retrieve_context.js';

/**
 * Create rag-memory agent specific adapter
 */
function createRagMemoryAdapter() {
  return {
    name: 'rag-memory',
    
    /**
     * Get RAG configuration context
     */
    async getConfigContext(query) {
      return retrieveContext(query, {
        mode: 'hybrid',
        topK: 5,
        agentName: 'rag-memory',
        includeMetadata: true,
      });
    },

    /**
     * Get embedding configuration
     */
    async getEmbeddingContext() {
      return retrieveContext('embedding configuration Ollama nomic provider', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'rag-memory',
      });
    },

    /**
     * Get chunking strategy context
     */
    async getChunkingContext() {
      return retrieveContext('chunking strategy semantic chunker section accumulator', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'rag-memory',
      });
    },

    /**
     * Get governance-aware retrieval
     */
    async getGovernanceAwareContext(query) {
      return governanceRetrieve(query, {
        mode: 'hybrid',
        topK: 5,
        agentName: 'rag-memory',
      });
    },

    /**
     * Get evaluation metrics context
     */
    async getEvaluationContext() {
      return retrieveContext('Recall@5 MRR NDCG evaluation metrics benchmark', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'rag-memory',
      });
    },
  };
}

export { createRagMemoryAdapter };
