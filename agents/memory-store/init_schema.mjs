// Schema initializer — handles $$ dollar-quoting via alternating $$ toggling
import pg from 'pg';
import { readFileSync } from 'fs';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgres://raguser:ragpass@localhost:5432/ragmemory', max: 1 });
const rawSql = readFileSync('../../docker/postgres/init-agent-memory.sql', 'utf8');

// Build a position-to-dollar-depth lookup
// Scan and maintain a running depth count: +1 at each $$, -1 at each $$
let depth = 0;
const depthAt = new Map(); // position -> dollar depth after consuming char

let i = 0;
while (i < rawSql.length) {
  if (i < rawSql.length - 1 && rawSql[i] === '$' && rawSql[i + 1] === '$') {
    // Toggle depth at this boundary
    depth = depth === 0 ? 1 : 0;
    depthAt.set(i, depth);
    i += 2;
  } else {
    depthAt.set(i, depth);
    i++;
  }
}

// Now split on semicolons at depth=0
const statements = [];
let current = '';
let lastSplit = 0;

for (let pos = 0; pos <= rawSql.length; pos++) {
  const isEnd = pos === rawSql.length;
  const ch = rawSql[pos];
  const depthHere = depthAt.get(pos) ?? 0;

  if (ch === ';' && depthHere === 0 && pos < rawSql.length) {
    // Split here
    const stmt = rawSql.slice(lastSplit, pos).trim().replace(/--[^\n]*/g, '').replace(/\n\s*\n/g, '\n').trim();
    if (stmt) statements.push(stmt);
    lastSplit = pos + 1;
  }
}

console.log(`Parsed ${statements.length} statements`);

const ignoreCodes = new Set(['42P07', '42710', '23505', '23503', '42P01', '42703']);
let success = 0, fail = 0;

for (const stmt of statements) {
  if (!stmt) continue;
  try {
    await pool.query(stmt);
    success++;
  } catch(e) {
    if (!ignoreCodes.has(e.code)) {
      fail++;
      console.log(`FAIL [${e.code}]: ${e.message.slice(0, 100)}`);
      console.log(`  => "${stmt.slice(0, 80)}"`);
    } else {
      success++;
    }
  }
}

console.log(`\nResult: ${success} ok / ${fail} failed`);

// Verify tables
console.log('\nTable verification:');
const tables = [
  'agents', 'agent_runs', 'agent_memories', 'memory_edges',
  'memory_events', 'retrieval_history', 'governance_audit_log', 'memory_embeddings'
];
for (const t of tables) {
  try {
    const r = await pool.query(`SELECT count(*) as c FROM ${t}`);
    console.log(`  ✓ ${t}: ${r.rows[0].c} rows`);
  } catch(e) {
    console.log(`  ✗ ${t} — MISSING`);
  }
}

// Verify triggers
console.log('\nTrigger verification:');
const triggerChecks = [
  ['trg_prevent_gal_modify', 'governance_audit_log'],
  ['trg_agent_memories_updated_at', 'agent_memories'],
  ['trg_agents_updated_at', 'agents'],
  ['trg_memory_events_log', 'agent_memories'],
];
for (const [tname, ttable] of triggerChecks) {
  try {
    const r = await pool.query(
      `SELECT 1 FROM pg_trigger WHERE tgname = $1 AND tgrelid = (SELECT oid FROM pg_class WHERE relname = $2)`,
      [tname, ttable]
    );
    console.log(`  ${r.rows.length > 0 ? '✓' : '?'} ${tname} on ${ttable}`);
  } catch(e) { console.log(`  ? ${tname} — ${e.message.slice(0,40)}`); }
}

await pool.end();
process.exit(fail > 0 ? 1 : 0);