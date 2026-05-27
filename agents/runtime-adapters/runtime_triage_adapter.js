// ========================================
// Runtime Triage Agent Adapter
// Specialized retrieval for runtime-triage agent
// ========================================

import { retrieveContext, governanceRetrieve } from '../rag-memory/runtime/retrieve_context.js';

/**
 * Create runtime-triage agent specific adapter
 */
function createRuntimeTriageAdapter() {
  return {
    name: 'runtime-triage',
    
    /**
     * Get error diagnosis context
     */
    async getDiagnosisContext(errorDescription) {
      return retrieveContext(errorDescription, {
        mode: 'hybrid',
        topK: 5,
        agentName: 'runtime-triage',
        explain: true,
      });
    },

    /**
     * Get error patterns context
     */
    async getErrorPatternsContext() {
      return retrieveContext('error patterns debugging troubleshooting common issues', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'runtime-triage',
      });
    },

    /**
     * Get runtime constraints context
     */
    async getConstraintsContext() {
      return governanceRetrieve('runtime constraints hard limits boundaries', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'runtime-triage',
      });
    },

    /**
     * Get monitoring context
     */
    async getMonitoringContext() {
      return retrieveContext('monitoring health checks metrics Prometheus', {
        mode: 'keyword',
        topK: 5,
        agentName: 'runtime-triage',
      });
    },

    /**
     * Get recovery strategies context
     */
    async getRecoveryContext() {
      return retrieveContext('recovery strategies error handling graceful degradation', {
        mode: 'hybrid',
        topK: 5,
        agentName: 'runtime-triage',
      });
    },
  };
}

export { createRuntimeTriageAdapter };
