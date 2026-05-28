/**
 * db_health.js — PostgreSQL connectivity check (lazy pg require)
 * Phase C.4 — v1.3.0
 *
 * pg is loaded lazily inside checkPostgres() so a missing pg package
 * degrades gracefully instead of crashing the server or build.
 */

'use strict';

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgres://raguser:ragpass@localhost:5433/ragmemory';

function maskUrl(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '(redacted)';
    if (u.username) u.username = '(redacted)';
    return u.toString();
  } catch { return '(redacted)'; }
}

async function loadPg() {
  try { return require('pg'); } catch (err) { return null; }
}

async function checkPostgres() {
  const t0 = Date.now();
  const pg = await loadPg();
  if (!pg || !pg.Pool) {
    return { ok: false, latencyMs: Date.now() - t0, error: 'pg package unavailable' };
  }
  const Pool = pg.Pool;
  const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT 1 AS ok');
      const latencyMs = Date.now() - t0;
      if (res.rows[0].ok !== 1) {
        return { ok: false, latencyMs, error: 'SELECT 1 returned unexpected value' };
      }
      return { ok: true, latencyMs };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    const latencyMs = Date.now() - t0;
    return { ok: false, latencyMs, error: err.message || String(err) };
  }
}

module.exports = { checkPostgres, DATABASE_URL: maskUrl(DATABASE_URL) };
