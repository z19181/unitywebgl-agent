// PostgreSQL connection pool for memory store
// Part of v1.3.0 Phase B.0

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

let pool = null;

// ──────────────────────────────────────────────────────────────
// getPool() — singleton pool
// ──────────────────────────────────────────────────────────────

export function getPool() {
  if (!pool) {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
    }
    pool = new Pool({
      connectionString: dbUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    pool.on('error', (err) => {
      console.error('[db] Unexpected pool error:', err.message);
    });
  }
  return pool;
}

// ──────────────────────────────────────────────────────────────
// query(sql, params) → result
// ──────────────────────────────────────────────────────────────

export async function query(sql, params = []) {
  const p = getPool();
  const start = Date.now();
  const result = await p.query(sql, params);
  const ms = Date.now() - start;
  if (ms > 1000) {
    console.warn(`[db] Slow query (${ms}ms): ${sql.slice(0, 80)}`);
  }
  return result;
}

// ──────────────────────────────────────────────────────────────
// transaction(callback) → result
// Executes a callback inside a transaction; auto-commits or auto-rolls-back
// ──────────────────────────────────────────────────────────────

export async function transaction(callback) {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ──────────────────────────────────────────────────────────────
// initSchema() — idempotent schema initialization
// Reads init-agent-memory.sql and executes it
// ──────────────────────────────────────────────────────────────

export async function initSchema(schemaPath) {
  const p = getPool();
  const sql = readFileSync(schemaPath, 'utf8');
  
  // Split on trigger/function boundaries to run as separate statements
  // The SQL file uses IF NOT EXISTS and CREATE OR REPLACE, so we can run it as-is
  // But we need to handle the trigger creation properly since triggers require the function to exist first
  // Strategy: run the whole file as one transaction; PostgreSQL handles dependencies
  
  await p.query(sql);
  console.log('[db] Schema initialized successfully');
}

// ──────────────────────────────────────────────────────────────
// healthCheck() → boolean
// ──────────────────────────────────────────────────────────────

export async function healthCheck() {
  try {
    const r = await query('SELECT 1 as ok, NOW() as ts');
    return r.rows[0].ok === 1;
  } catch (err) {
    console.error('[db] healthCheck failed:', err.message);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// closePool()
// ──────────────────────────────────────────────────────────────

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// ──────────────────────────────────────────────────────────────
// resetPool() — for testing only
// ──────────────────────────────────────────────────────────────

export function resetPool() {
  pool = null;
}

// ──────────────────────────────────────────────────────────────
// Table existence helpers
// ──────────────────────────────────────────────────────────────

export async function tableExists(tableName) {
  const r = await query(
    `SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
    [tableName]
  );
  return r.rows.length > 0;
}

// ──────────────────────────────────────────────────────────────
// rowCount(tableName) → number
// ──────────────────────────────────────────────────────────────

export async function rowCount(tableName) {
  const r = await query(`SELECT COUNT(*) as cnt FROM ${tableName}`);
  return parseInt(r.rows[0].cnt, 10);
}