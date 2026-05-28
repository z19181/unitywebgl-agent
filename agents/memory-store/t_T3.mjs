import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgres://raguser:ragpass@localhost:5432/ragmemory', max: 1 });
let passed = 0, failed = 0;
function assert(c, m) { if (c) { console.log('  ✅ ' + m); passed++; } else { console.log('  ❌ ' + m); failed++; } }

async function initSchema() {
  try { await pool.query('SELECT 1 FROM agents LIMIT 1'); return; } catch(_) {}
  const sql = readFileSync(resolve(process.cwd(), '../../docker/postgres/init-agent-memory.sql'), 'utf8');
  const stmts = []; let depth = 0, buf = '';
  for (let i = 0; i < sql.length; ) {
    if (i < sql.length - 1 && sql[i] === '$' && sql[i + 1] === '$') { depth = depth === 0 ? 1 : 0; buf += '$$'; i += 2; }
    else if (sql[i] === ';' && depth === 0) { const s = buf.trim().replace(/--[^\n]*/g, '').replace(/\n\s*\n/g, '\n').trim(); if (s) stmts.push(s); buf = ''; i++; }
    else { buf += sql[i]; i++; }
  }
  const last = buf.trim().replace(/--[^\n]*/g, '').trim(); if (last) stmts.push(last);
  const ignore = new Set(['42P07', '42710', '23505', '23503', '42P01', '42703']);
  for (const s of stmts) { try { await pool.query(s); } catch (e) { if (!ignore.has(e.code)) console.log('  [warn]', e.code, e.message.slice(0, 60)); } }
  if (global.gc) global.gc();
}

async function cleanup() {
  await pool.query('ALTER TABLE agent_memories DISABLE TRIGGER ALL').catch(() => {});
  await pool.query('ALTER TABLE agents DISABLE TRIGGER ALL').catch(() => {});
  await pool.query("DELETE FROM agent_memories").catch(() => {});
  await pool.query("DELETE FROM agents").catch(() => {});
  await pool.query("DELETE FROM memory_events").catch(() => {});
  await pool.query("DELETE FROM agent_runs").catch(() => {});
  await pool.query("DELETE FROM retrieval_history").catch(() => {});
  await pool.query("DELETE FROM governance_audit_log").catch(() => {});
  await pool.query("DELETE FROM memory_edges").catch(() => {});
  await pool.query('ALTER TABLE agent_memories ENABLE TRIGGER ALL').catch(() => {});
  await pool.query('ALTER TABLE agents ENABLE TRIGGER ALL').catch(() => {});
  if (global.gc) global.gc();
}

async function done() {
  if (global.gc) global.gc();
  console.log('\n  Result: ' + passed + ' passed / ' + failed + ' failed');
  await pool.end();
  // Ensure db.js singleton pool is also closed to prevent OOM on exit
  try { const db = await import('./db.js'); await db.closePool(); } catch (_) {}
  process.exit(failed > 0 ? 1 : 0);
}

  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const ss = await import('./secret_scanner.js');
  let errorCaught = null;
  try {
    await ms.createMemory({ agentName: 'test-agent-t3', memoryType: 'episodic', title: 'Test with secret', content: 'My API key is sk-ABC1234567890abcdefghijklmnop', source: 'agent', importance: 5 });
  } catch (err) { errorCaught = err; }
  assert(errorCaught !== null, 'Error thrown for secret content');
  assert(errorCaught instanceof ss.SecurityError, 'SecurityError thrown');
  assert(errorCaught.secrets && errorCaught.secrets.length > 0, 'Secrets array present');
  assert(errorCaught.secrets[0].type === 'OPENAI_KEY', 'OPENAI_KEY type detected');
  await done();
