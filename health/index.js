/**
 * index.js — System Health Orchestrator
 * Phase C.4 — v1.3.0
 *
 * Aggregates all health checks into a single system health object.
 *
 * Status mapping:
 *   healthy  → all checks pass
 *   degraded → some optional checks fail, but core (postgres) is up
 *   critical → postgres is down or multiple core systems fail
 *
 * Export: async function getSystemHealth()
 * Returns: { status, timestamp, checks: {...}, degraded: [...], critical: [...] }
 */

'use strict';

const { checkPostgres } = require('./db_health.js');
const { checkPgvector } = require('./pgvector_health.js');
const { checkRetrieval } = require('./retrieval_health.js');
const { checkGraph }     = require('./graph_health.js');
const { checkCache }      = require('./cache_health.js');

const STATUS = { HEALTHY: 'healthy', DEGRADED: 'degraded', CRITICAL: 'critical' };

/**
 * Run all health checks in parallel.
 * Each check is wrapped in try/catch so one failure doesn't block others.
 */
async function getSystemHealth() {
  const timestamp = new Date().toISOString();

  // Run all checks concurrently
  const [
    pgRes,
    pgvRes,
    retRes,
    graphRes,
    cacheRes,
  ] = await Promise.allSettled([
    checkPostgres(),
    checkPgvector(),
    checkRetrieval(),
    checkGraph(),
    checkCache(),
  ]);

  // Helper: unwrap Promise.allSettled result
  function unwrap(result, fallback) {
    if (result.status === 'fulfilled') return result.value;
    return Object.assign({}, fallback, { ok: false, error: String(result.reason) });
  }

  const checks = {
    postgres:  unwrap(pgRes,    { ok: false, latencyMs: 0 }),
    pgvector: unwrap(pgvRes,   { ok: false, latencyMs: 0 }),
    retrieval: unwrap(retRes,    { ok: false, latencyMs: 0 }),
    graph:     unwrap(graphRes,   { ok: false, latencyMs: 0 }),
    cache:     unwrap(cacheRes,   { ok: false, latencyMs: 0 }),
  };

  // Classify: degraded = optional failures; critical = postgres (or pgvector) down
  const degraded = [];
  const critical = [];

  // pgvector failure is degraded (core PG still works, just no vector search)
  if (!checks.pgvector.ok) {
    degraded.push({
      component: 'pgvector',
      reason: checks.pgvector.error || 'pgvector check failed',
      latencyMs: checks.pgvector.latencyMs,
    });
  }

  // retrieval failure is degraded (graceful fallback exists)
  if (!checks.retrieval.ok) {
    degraded.push({
      component: 'retrieval',
      reason: checks.retrieval.error || 'retrieval check failed',
      latencyMs: checks.retrieval.latencyMs,
    });
  }

  // graph failure is degraded (dashboard shows mock data)
  if (!checks.graph.ok) {
    degraded.push({
      component: 'graph',
      reason: checks.graph.error || 'graph check failed',
      latencyMs: checks.graph.latencyMs,
    });
  }

  // cache failure is degraded (performance only)
  if (!checks.cache.ok) {
    degraded.push({
      component: 'cache',
      reason: checks.cache.error || 'cache check failed',
      latencyMs: checks.cache.latencyMs,
    });
  }

  // postgres failure is CRITICAL (everything depends on it)
  if (!checks.postgres.ok) {
    critical.push({
      component: 'postgres',
      reason: checks.postgres.error || 'postgres unavailable',
      latencyMs: checks.postgres.latencyMs,
    });
  }

  // Determine overall status
  let status;
  if (critical.length > 0) {
    status = STATUS.CRITICAL;
  } else if (degraded.length > 0) {
    status = STATUS.DEGRADED;
  } else {
    status = STATUS.HEALTHY;
  }

  return { status, timestamp, checks, degraded, critical };
}

module.exports = { getSystemHealth, STATUS };
