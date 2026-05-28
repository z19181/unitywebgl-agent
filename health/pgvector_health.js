/**
 * pgvector_health.js — pgvector extension + table accessibility check
 * Phase C.4 — v1.3.0
 *
 * pg is loaded lazily so a missing pg package degrades gracefully.
 */

'use strict';

const DATABASE_URL = process.env.DATABASE_URL
  || 'postgres://raguser:ragpass@localhost:5433/ragmemory';

const TABLE_NAME = process.env.PGVECTOR_TABLE || 'document_embeddings';

async function loadPg() {
  try { return require('pg'); } catch (err) { return null; }
}

async function checkPgvector() {
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
      const extRes = await client.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
      );
      const extension = (extRes.rows.length > 0);

      let table = false;
      try {
        await client.query(`SELECT COUNT(*) FROM "${TABLE_NAME}" LIMIT 1`);
        table = true;
      } catch (tblErr) {
        table = false;
      }

      const latencyMs = Date.now() - t0;
      return { ok: extension, latencyMs, extension, table };
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    const latencyMs = Date.now() - t0;
    return { ok: false, latencyMs, error: err.message || String(err) };
  }
}

module.exports = { checkPgvector };
