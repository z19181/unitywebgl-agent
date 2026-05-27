// ========================================
// Model Router Agent Adapter
// Specialized retrieval for model-router agent
// ========================================

import { retrieveContext } from '../rag-memory/runtime/retrieve_context.js';

/**
 * Create model-router agent specific adapter
 */
function createModelRouterAdapter() {
  return {
    name: 'model-router',
    
    /**
     * Get routing decision context
     */
    async getRoutingContext(query) {
      return retrieveContext(query, {
        mode: 'hybrid',
        topK: 5,
        agentName: 'model-router',
        explain: true,
      });
    },

    /**
     * Get model comparison context
     */
    async getModelComparisonContext() {
      return retrieveContext('model comparison capabilities benchmarks performance', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'model-router',
      });
    },

    /**
     * Get latency requirements context
     */
    async getLatencyContext() {
      return retrieveContext('latency requirements response time SLA', {
        mode: 'keyword',
        topK: 5,
        agentName: 'model-router',
      });
    },

    /**
     * Get cost optimization context
     */
    async getCostOptimizationContext() {
      return retrieveContext('cost optimization model selection routing strategies', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'model-router',
      });
    },

    /**
     * Get fallback strategies context
     */
    async getFallbackContext() {
      return retrieveContext('fallback strategies primary backup model routing', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'model-router',
      });
    },
  };
}

export { createModelRouterAdapter };
