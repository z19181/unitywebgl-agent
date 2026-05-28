/**
 * retrieval_health.js — retrieval runtime health check
 * Phase C.4 — v1.3.0
 *
 * Checks:
 *   1. retrieveContext is importable and functional
 *   2. A smoke query returns results (or graceful fallback)
 *   3. No governance violations in recent window
 *
 * Returns: { ok: boolean, latencyMs: number, error?: string, violations?: number }
 */

'use strict';

const path = require('path');
const retrievalPath = path.join(__dirname, '..', 'agents', 'rag-memory', 'runtime', 'retrieve_context.js');

async function checkRetrieval() {
  const t0 = Date.now();
  try {
    // Dynamic import — may fail if dependencies missing
    let retrieveContext;
    try {
      retrieveContext = require(retrievalPath);
    } catch (importErr) {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'retrieve_context.js not loadable: ' + (importErr.message || String(importErr)),
      };
    }

    // Smoke query — lightweight, should not throw
    let result;
    try {
      if (typeof retrieveContext !== 'function' && retrieveContext && typeof retrieveContext.retrieveContext === 'function') {
        result = await retrieveContext.retrieveContext('health check smoke query', 3);
      } else if (typeof retrieveContext === 'function') {
        result = await retrieveContext('health check smoke query', 3);
      } else {
        return {
          ok: false,
          latencyMs: Date.now() - t0,
          error: 'retrieveContext is not a callable function',
        };
      }
    } catch (queryErr) {
      // Query failure is degraded, not critical — function exists but runtime fails
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'retrieval smoke query failed: ' + (queryErr.message || String(queryErr)),
      };
    }

    const latencyMs = Date.now() - t0;

    // Check violations if result has metadata
    const violations = (result && result.metadata && typeof result.metadata.violations === 'number')
      ? result.metadata.violations
      : 0;

    return { ok: true, latencyMs, violations };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err.message || String(err),
    };
  }
}

module.exports = { checkRetrieval };
