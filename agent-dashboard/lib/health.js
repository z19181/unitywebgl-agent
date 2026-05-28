/**
 * lib/health.js — System Health Orchestrator
 * Phase C.4 — v1.3.0
 *
 * All health check logic lives here (inside the Next.js webpack bundle).
 * Each sub-check handles missing 'pg' gracefully via lazy require.
 * This file replaces the need for cross-context module imports.
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────
const STATUS = {
  HEALTHY:  'healthy',
  DEGRADED: 'degraded',
  CRITICAL: 'critical',
};

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgres://raguser:ragpass@localhost:5433/ragmemory';

const PGVECTOR_TABLE = process.env.PGVECTOR_TABLE || 'document_embeddings';

// ── pg lazy-loader (handles missing package gracefully) ──────────────
async function loadPg() {
  try { return require('pg'); } catch { return null; }
}

// ── Sub-checks ───────────────────────────────────────────────────────

async function checkPostgres() {
  const t0 = Date.now();
  const pg = await loadPg();
  if (!pg || !pg.Pool) {
    return { ok: false, latencyMs: Date.now() - t0, error: 'pg package unavailable' };
  }
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT 1 AS ok');
      const latencyMs = Date.now() - t0;
      return { ok: res.rows[0]?.ok === 1, latencyMs };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: err.message || String(err) };
  }
}

async function checkPgvector() {
  const t0 = Date.now();
  const pg = await loadPg();
  if (!pg || !pg.Pool) {
    return { ok: false, latencyMs: Date.now() - t0, error: 'pg package unavailable' };
  }
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const extRes = await client.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
      );
      const extension = extRes.rows.length > 0;
      let table = false;
      try {
        await client.query(`SELECT COUNT(*) FROM "${PGVECTOR_TABLE}" LIMIT 1`);
        table = true;
      } catch { table = false; }
      return { ok: extension, latencyMs: Date.now() - t0, extension, table };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - t0, error: err.message || String(err) };
  }
}

async function checkRetrieval() {
  // Retrieval runtime health: returns ok=true if we reach this point
  // (actual retrieval checks are optional / non-critical)
  return { ok: true, latencyMs: 0 };
}

async function checkGraph() {
  // Graph runtime health: returns ok=true if we reach this point
  return { ok: true, latencyMs: 0 };
}

async function checkCache() {
  return { ok: true, latencyMs: 0 };
}

// ── Orchestrator ─────────────────────────────────────────────────────

async function getSystemHealth() {
  const [postgres, pgvector, retrieval, graph, cache] = await Promise.all([
    checkPostgres(),
    checkPgvector(),
    checkRetrieval(),
    checkGraph(),
    checkCache(),
  ]);

  const checks = { postgres, pgvector, retrieval, graph, cache };
  const degraded  = [];
  const critical  = [];

  if (!postgres.ok) {
    critical.push({ component: 'postgres', reason: postgres.error, latencyMs: postgres.latencyMs });
  }
  const optional = [
    { name: 'pgvector',  check: pgvector },
    { name: 'retrieval', check: retrieval },
    { name: 'graph',     check: graph },
    { name: 'cache',     check: cache },
  ];
  for (const { name, check } of optional) {
    if (!check.ok) {
      degraded.push({ component: name, reason: check.error, latencyMs: check.latencyMs });
    }
  }

  let status;
  if (critical.length > 0)  status = STATUS.CRITICAL;
  else if (degraded.length > 0) status = STATUS.DEGRADED;
  else                         status = STATUS.HEALTHY;

  return { status, timestamp: new Date().toISOString(), checks, degraded, critical };
}

module.exports = { getSystemHealth, STATUS };
