import pg from 'pg';
import { getPool } from './db.js';

const pool = getPool();

// Disable the memory_events trigger temporarily during tests
async function disableTriggers() {
  await pool.query('ALTER TABLE agent_memories DISABLE TRIGGER ALL');
  await pool.query('ALTER TABLE agents DISABLE TRIGGER ALL');
  console.log('Triggers disabled');
}

async function enableTriggers() {
  await pool.query('ALTER TABLE agent_memories ENABLE TRIGGER ALL');
  await pool.query('ALTER TABLE agents ENABLE TRIGGER ALL');
  console.log('Triggers enabled');
}

async function cleanTables() {
  await pool.query('DELETE FROM memory_events');
  await pool.query('DELETE FROM retrieval_history');
  await pool.query('DELETE FROM governance_audit_log');
  await pool.query('DELETE FROM memory_edges');
  await pool.query('DELETE FROM agent_memories');
  await pool.query('DELETE FROM agent_runs');
  await pool.query('DELETE FROM agents');
  console.log('All tables cleaned');
}

async function cleanup() {
  await disableTriggers();
  await cleanTables();
  await enableTriggers();
}

await cleanup();
await pool.end();
console.log('Done');