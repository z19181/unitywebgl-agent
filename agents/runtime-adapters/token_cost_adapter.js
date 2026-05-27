// ========================================
// Token Cost Agent Adapter
// Specialized retrieval for token-cost agent
// ========================================

import { retrieveContext } from '../rag-memory/runtime/retrieve_context.js';

/**
 * Create token-cost agent specific adapter
 */
function createTokenCostAdapter() {
  return {
    name: 'token-cost',
    
    /**
     * Get token cost estimation context
     */
    async getCostEstimationContext(query) {
      return retrieveContext(query, {
        mode: 'hybrid',
        topK: 5,
        agentName: 'token-cost',
        includeScores: false,
      });
    },

    /**
     * Get model pricing context
     */
    async getModelPricingContext() {
      return retrieveContext('model pricing token cost GPT-4 Claude pricing', {
        mode: 'keyword',
        topK: 5,
        agentName: 'token-cost',
      });
    },

    /**
     * Get optimization strategies context
     */
    async getOptimizationContext() {
      return retrieveContext('token optimization strategies context compression', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'token-cost',
      });
    },

    /**
     * Get usage tracking context
     */
    async getTrackingContext() {
      return retrieveContext('usage tracking monitoring cost logging', {
        mode: 'keyword',
        topK: 5,
        agentName: 'token-cost',
      });
    },

    /**
     * Get budget constraints context
     */
    async getBudgetContext() {
      return retrieveContext('budget constraints limits cost caps', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'token-cost',
      });
    },
  };
}

export { createTokenCostAdapter };
