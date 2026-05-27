// ========================================
// Release Manager Adapter
// Specialized retrieval for release-manager agent
// ========================================

import { retrieveContext } from '../rag-memory/runtime/retrieve_context.js';

/**
 * Create release-manager specific adapter
 */
function createReleaseManagerAdapter() {
  return {
    name: 'release-manager',
    
    /**
     * Get release gate context
     */
    async getReleaseGateContext(query) {
      return retrieveContext(query, {
        mode: 'hybrid',
        topK: 5,
        requireGovernance: true,
        agentName: 'release-manager',
        explain: true,
      });
    },

    /**
     * Get governance context for release decision
     */
    async getGovernanceContext() {
      return retrieveContext('release gate process governance constraints', {
        mode: 'hybrid',
        topK: 5,
        requireGovernance: true,
        agentName: 'release-manager',
      });
    },

    /**
     * Get version history context
     */
    async getVersionHistoryContext(version) {
      return retrieveContext(`version ${version} history release notes`, {
        mode: 'keyword',
        topK: 5,
        agentName: 'release-manager',
      });
    },

    /**
     * Validate release against constraints
     */
    async validateRelease(query) {
      return retrieveContext(query, {
        mode: 'hybrid',
        topK: 10,
        requireGovernance: true,
        agentName: 'release-manager',
      });
    },
  };
}

export { createReleaseManagerAdapter };
