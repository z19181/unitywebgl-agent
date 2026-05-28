/**
 * graph_health.js — runtime graph health check
 * Phase C.4 — v1.3.0
 *
 * Checks:
 *   1. runtime_graph.js is importable
 *   2. Graph summary loads (getGraphSummary)
 *   3. Node/edge counts are readable
 *
 * Returns: { ok: boolean, latencyMs: number, error?: string, nodeCount?: number, edgeCount?: number }
 */

'use strict';

const path = require('path');
const graphPath = path.join(__dirname, '..', 'agents', 'memory-store', 'runtime_graph.js');

async function checkGraph() {
  const t0 = Date.now();
  try {
    // Dynamic import
    let getGraphSummary;
    try {
      const graphModule = require(graphPath);
      getGraphSummary = graphModule.getGraphSummary || graphModule.default;
    } catch (importErr) {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'runtime_graph.js not loadable: ' + (importErr.message || String(importErr)),
      };
    }

    if (typeof getGraphSummary !== 'function') {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'getGraphSummary is not a callable function',
      };
    }

    // Call with defaults (no filter = full summary)
    let summary;
    try {
      summary = await getGraphSummary();
    } catch (queryErr) {
      return {
        ok: false,
        latencyMs: Date.now() - t0,
        error: 'getGraphSummary() threw: ' + (queryErr.message || String(queryErr)),
      };
    }

    const latencyMs = Date.now() - t0;

    if (!summary || typeof summary !== 'object') {
      return {
        ok: false,
        latencyMs,
        error: 'getGraphSummary() returned invalid data',
      };
    }

    const nodeCount = (summary.nodes && Array.isArray(summary.nodes)) ? summary.nodes.length : 0;
    const edgeCount = (summary.edges && Array.isArray(summary.edges)) ? summary.edges.length : 0;

    return { ok: true, latencyMs, nodeCount, edgeCount };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err.message || String(err),
    };
  }
}

module.exports = { checkGraph };
