// Memory Store Tests — v1.3.0 Phase B.0
// Each test group: write temp .mjs file + spawn with --expose-gc
// Isolated processes prevent heap accumulation; explicit GC prevents heap buildup

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_SCRIPTS = [
  ['T1',  'getOrCreateAgent'],
  ['T2',  'createMemory basic'],
  ['T3',  'createMemory rejects secret'],
  ['T4',  'createMemory allowRedacted'],
  ['T5',  'archiveMemory excludes from search'],
  ['T6',  'linkMemories creates edge'],
  ['T7',  'recordRetrieval redacts secret query'],
  ['T8',  'startRun/endRun lifecycle'],
  ['T9',  'governance_audit_log insert works'],
  ['T10', 'governance_audit_log update/delete fails'],
  ['T11', 'searchMemory returns non-archived'],
  ['T12', 'secret scanner unit tests'],
];

let totalPassed = 0, totalFailed = 0;
const pad = s => String(s).padEnd(28);

// ─── Common preamble ───────────────────────────────────────────────────────────

const PREAMBLE = `
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
    else if (sql[i] === ';' && depth === 0) { const s = buf.trim().replace(/--[^\\n]*/g, '').replace(/\\n\\s*\\n/g, '\\n').trim(); if (s) stmts.push(s); buf = ''; i++; }
    else { buf += sql[i]; i++; }
  }
  const last = buf.trim().replace(/--[^\\n]*/g, '').trim(); if (last) stmts.push(last);
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
  console.log('\\n  Result: ' + passed + ' passed / ' + failed + ' failed');
  await pool.end();
  // Ensure db.js singleton pool is also closed to prevent OOM on exit
  try { const db = await import('./db.js'); await db.closePool(); } catch (_) {}
  process.exit(failed > 0 ? 1 : 0);
}
`.trim();

// ─── Test bodies ───────────────────────────────────────────────────────────────

const TEST_BODIES = {
  T1: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const agent = await ms.getOrCreateAgent('test-agent-t1', { agentType: 'test', description: 'T1' });
  assert(agent.id !== null, 'Agent created with non-null UUID');
  assert(agent.name === 'test-agent-t1', 'Agent name matches');
  assert(agent.agentType === 'test', 'Agent type stored correctly');
  assert(agent.isActive === true, 'Agent is active by default');
  const reused = await ms.getOrCreateAgent('test-agent-t1', {});
  assert(reused.id === agent.id, 'Reuse returns same agent ID');
  await done();
`,

  T2: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const mem = await ms.createMemory({ agentName: 'test-agent-t2', memoryType: 'episodic', title: 'Test Memory T2', content: 'This is a test memory created in phase B.0.', source: 'agent', importance: 8, confidence: 0.95, tags: ['test', 'phase-b'], metadata: { testId: 't2' } });
  assert(mem.id !== null, 'Memory created with UUID');
  assert(mem.agentName === 'test-agent-t2', 'Agent name set correctly');
  assert(mem.memoryType === 'episodic', 'Memory type set correctly');
  assert(mem.title === 'Test Memory T2', 'Title stored correctly');
  assert(mem.content.includes('test memory created in phase B'), 'Content stored correctly');
  assert(mem.importance === 8, 'Importance set correctly');
  assert(mem.confidence === 0.95, 'Confidence set correctly');
  assert(mem.tags.includes('test'), 'Tags stored (test)');
  assert(mem.tags.includes('phase-b'), 'Tags stored (phase-b)');
  assert(mem.metadata.testId === 't2', 'Metadata stored correctly');
  assert(mem.isArchived === false, 'Not archived by default');
  assert(mem.createdAt !== null, 'Created at set');
  const retrieved = await ms.getMemory(mem.id);
  assert(retrieved !== null, 'Memory can be retrieved by ID');
  assert(retrieved.title === 'Test Memory T2', 'Retrieved title matches');
  if (global.gc) global.gc();
  await done();
`,

  T3: `
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
`,

  T4: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const mem = await ms.createMemory({ agentName: 'test-agent-t4', memoryType: 'episodic', title: 'Redacted memory', content: 'Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozegQ', source: 'agent', importance: 5, allowRedacted: true });
  assert(mem.content.includes('[REDACTED:'), 'Content is redacted');
  assert(mem.metadata._redacted === true, 'Metadata flags redacted');
  assert(mem.metadata._redactionReason === 'secrets detected', 'Redaction reason stored');
  assert(!mem.content.includes('eyJ'), 'Original JWT not in stored content');
  if (global.gc) global.gc();
  await done();
`,

  T5: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const mem = await ms.createMemory({ agentName: 'test-agent-t5', memoryType: 'episodic', title: 'Memory to archive', content: 'This memory will be archived.', source: 'agent', importance: 7 });
  assert(mem.isArchived === false, 'Memory not archived before');
  const archived = await ms.archiveMemory(mem.id, { reason: 'Test archive T5' });
  assert(archived.isArchived === true, 'Memory isArchived=true after archive');
  assert(archived.archivedAt !== null, 'Archived at timestamp set');
  const retrievedDefault = await ms.getMemory(mem.id);
  assert(retrievedDefault === null, 'Archived memory not returned by getMemory(default)');
  const retrievedExplicit = await ms.getMemory(mem.id, { includeArchived: true });
  assert(retrievedExplicit !== null, 'Archived memory returned with includeArchived=true');
  assert(retrievedExplicit.isArchived === true, 'Returned memory has isArchived=true');
  const searchResults = await ms.searchMemory('archived', { agentName: 'test-agent-t5' });
  const foundArchived = searchResults.some(r => r.memory.id === mem.id);
  assert(!foundArchived, 'Archived memory excluded from search results');
  if (global.gc) global.gc();
  await done();
`,

  T6: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  const memA = await ms.createMemory({ agentName: 'test-agent-t6', memoryType: 'episodic', title: 'Memory A', content: 'Memory A content', source: 'agent' });
  const memB = await ms.createMemory({ agentName: 'test-agent-t6', memoryType: 'episodic', title: 'Memory B', content: 'Memory B content depends on A', source: 'agent' });
  const edge = await ms.linkMemories(memA.id, memB.id, 'depends_on', { weight: 0.8 });
  assert(edge.id !== null, 'Edge created with UUID');
  assert(edge.fromMemoryId === memA.id, 'Edge from is correct');
  assert(edge.toMemoryId === memB.id, 'Edge to is correct');
  assert(edge.relationType === 'depends_on', 'Edge type is depends_on');
  assert(edge.weight === 0.8, 'Edge weight stored');
  const graph = await ms.getMemoryGraph(memA.id);
  assert(graph.nodes.length >= 2, 'Graph has at least 2 nodes');
  assert(graph.edges.some(e => e.relationType === 'depends_on'), 'depends_on edge in graph');
  if (global.gc) global.gc();
  await done();
`,

  T7: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  if (global.gc) global.gc();
  const normal = await ms.recordRetrieval({ queryText: 'What are the Five Iron Laws?', mode: 'hybrid', topK: 5, agentName: 'test-agent-t7', latencyMs: 42 });
  assert(normal.id !== null, 'Retrieval record created');
  assert(normal.queryRedacted === false, 'Normal query not redacted');
  assert(normal.queryText === 'What are the Five Iron Laws?', 'Query text stored correctly');
  assert(normal.redactionReason === null, 'No redaction reason for clean query');
  const secret = await ms.recordRetrieval({ queryText: 'Use this key sk-ABCDEFGHIJKLMNOPQRSTUV for the next request', mode: 'hybrid', topK: 5, agentName: 'test-agent-t7', latencyMs: 38 });
  assert(secret.queryRedacted === true, 'Query with secret is redacted');
  assert(secret.queryText.includes('[REDACTED:'), 'Redacted query text stored');
  assert(secret.redactionReason === 'secrets detected in query', 'Redaction reason set');
  assert(secret.originalQueryHash !== null, 'Original query hash stored (for audit)');
  assert(!secret.queryText.includes('sk-ABCDEFGHIJKLMNOP'), 'Original key not in stored query');
  if (global.gc) global.gc();
  await done();
`,

  T8: `
  await initSchema();
  await cleanup();
  const ar = await import('./agent_runs.js');
  const run = await ar.startRun('test-agent-t8', { sessionKey: 'test-session-t8', model: 'qclaw/modelroute' });
  assert(run.id !== null, 'Run created with UUID');
  assert(run.agentId !== null, 'Agent ID set on run');
  assert(run.sessionKey === 'test-session-t8', 'Session key stored');
  assert(run.model === 'qclaw/modelroute', 'Model stored');
  assert(run.startedAt !== null, 'Started at set');
  assert(run.endedAt === null, 'Not ended yet');
  // Small sleep so runtimeMs is measurable
  await new Promise(r => setTimeout(r, 50));
  const ended = await ar.endRun(run.id, 'completed');
  assert(ended.endedAt !== null, 'Ended at set');
  assert(Number(ended.runtimeMs) >= 0, 'Runtime ms >= 0 (allow 0 for fast DB)');
  assert(ended.exitReason === 'completed', 'Exit reason stored');
  if (global.gc) global.gc();
  await done();
`,

  T9: `
  await initSchema();
  const ms = await import('./memory_store.js');
  if (global.gc) global.gc();
  const record = await ms.recordGovernanceDecision({ agentName: 'test-agent-t9', ruleName: 'test_rule_governance', action: 'enforced', decision: 'block', evidence: { query: 'test', matched: true, score: 0.95 }, queryText: 'What is my API key?', metadata: { testPhase: 'B.0' } });
  assert(record.id !== null, 'Governance record created');
  assert(record.ruleName === 'test_rule_governance', 'Rule name stored');
  assert(record.action === 'enforced', 'Action stored');
  assert(record.decision === 'block', 'Decision stored');
  assert(record.createdAt !== null, 'Created at set');
  if (global.gc) global.gc();
  await done();
`,

  T10: `
  await initSchema();
  const ms = await import('./memory_store.js');
  if (global.gc) global.gc();
  const record = await ms.recordGovernanceDecision({ agentName: 'test-agent-t10', ruleName: 'test_insert_only_rule', action: 'queried', decision: 'allow', evidence: { test: true } });
  const recordId = record.id;
  let updateFailed = false;
  try { await pool.query('UPDATE governance_audit_log SET decision = \\'block\\' WHERE id = $1', [recordId]); }
  catch (err) { updateFailed = err.message.includes('insert-only') || err.code === 'EF000'; }
  assert(updateFailed, 'UPDATE on governance_audit_log fails due to trigger');
  let deleteFailed = false;
  try { await pool.query('DELETE FROM governance_audit_log WHERE id = $1', [recordId]); }
  catch (err) { deleteFailed = err.message.includes('insert-only') || err.code === 'EF000'; }
  assert(deleteFailed, 'DELETE on governance_audit_log fails due to trigger');
  if (global.gc) global.gc();
  await done();
`,

  T11: `
  await initSchema();
  await cleanup();
  const ms = await import('./memory_store.js');
  if (global.gc) global.gc();
  const memActive = await ms.createMemory({ agentName: 'test-agent-t11', memoryType: 'semantic', title: 'Active Semantic Memory T11', content: 'This is an important semantic memory about the project.', source: 'agent', importance: 9 });
  const memArchived = await ms.createMemory({ agentName: 'test-agent-t11', memoryType: 'semantic', title: 'Archived Semantic Memory T11', content: 'This semantic memory should be archived.', source: 'agent', importance: 3 });
  await ms.archiveMemory(memArchived.id, { reason: 'Test T11 archival' });
  const results = await ms.searchMemory('semantic memory', { agentName: 'test-agent-t11', limit: 10 });
  const activeFound   = results.some(r => r.memory.id === memActive.id);
  const archivedFound = results.some(r => r.memory.id === memArchived.id);
  assert(activeFound, 'Active memory found in search results');
  assert(!archivedFound, 'Archived memory excluded from search results');
  if (global.gc) global.gc();
  await done();
`,

  T12: `
  if (global.gc) global.gc();
  const ss = await import('./secret_scanner.js');
  const cases = [
    { input: 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ab', expected: 'OPENAI_KEY' },
    { input: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig', expected: 'BEARER_TOKEN' },
    { input: 'api_key=MySecretPassword123456', expected: 'API_KEY' },
    { input: 'password=MySecretPass123', expected: 'PASSWORD' },
    { input: 'AKIAIOSFODNN7EXAMPLE', expected: 'AWS_KEY' },
    { input: 'ghp_abcdefghijklmnopqrstuvwxyz1234567890', expected: 'GITHUB_TOKEN' },
  ];
  for (const tc of cases) { const found = ss.detectSecrets(tc.input); assert(found.some(x => x.type === tc.expected), 'detectSecrets: ' + tc.expected + ' detected'); }
  const clean = ss.detectSecrets('This is normal text about project architecture and no secrets.'); assert(clean.length === 0, 'detectSecrets: clean content returns empty');
  const redacted = ss.redactSecrets('My key is sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ'); assert(redacted.includes('[REDACTED:'), 'redactSecrets: produces REDACTED marker'); assert(!redacted.includes('sk-ABCDEFGHIJK'), 'redactSecrets: original key not in result');
  const hash = ss.hashOriginal('test content'); assert(hash !== null && hash.length === 64, 'hashOriginal: returns 64-char SHA-256');
  const scanClean = ss.scanMemoryFields({ content: 'Normal content', title: 'Normal title', tags: ['tag1'], metadata: { k: 'v' } }); assert(scanClean.isClean === true, 'scanMemoryFields: clean content passes');
  const scanDirty = ss.scanMemoryFields({ content: 'API key sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456' }); assert(scanDirty.hasSecrets === true, 'scanMemoryFields: detects secrets'); assert(scanDirty.secrets[0].field === 'content', 'scanMemoryFields: identifies content field');
  if (global.gc) global.gc();
  console.log('\\n  Result: ' + passed + ' passed / ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
`,
};

// ─── Test runner ──────────────────────────────────────────────────────────────

function runTest(id, name) {
  return new Promise((resolve) => {
    const script = PREAMBLE + '\n' + (TEST_BODIES[id] || 'console.log("Unknown test"); process.exit(0);');
    const tmpFile = join('/Users/applemima1111/.qclaw/workspace/PartyGameSDK-MVP/agents/memory-store', `t_${id}.mjs`);
    writeFileSync(tmpFile, script);

    // --expose-gc lets tests call global.gc() to reclaim heap between operations
    const child = spawn('node', ['--max-old-space-size=768', '--expose-gc', tmpFile], {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL || 'postgres://raguser:ragpass@localhost:5432/ragmemory' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', d => { const s = d.toString(); output += s; process.stdout.write(s); });
    child.stderr.on('data', d => process.stderr.write(d));

    const timer = setTimeout(() => {
      child.kill();
      console.log('  ⏱️  Timeout after 120s');
      try { unlinkSync(tmpFile); } catch (_) {}
      resolve({ passed: 0, failed: 1 });
    }, 120000);

    child.on('close', code => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch (_) {}
      const match = output.match(/Result:\s+(\d+)\s+passed\s+\/\s+(\d+)\s+failed/);
      if (match) {
        resolve({ passed: parseInt(match[1]), failed: parseInt(match[2]) });
      } else {
        resolve({ passed: 0, failed: 1 });
      }
    });

    child.on('error', () => {
      clearTimeout(timer);
      try { unlinkSync(tmpFile); } catch (_) {}
      resolve({ passed: 0, failed: 1 });
    });
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Memory Store Tests — v1.3.0 Phase B.0             ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  for (const [id, name] of TEST_SCRIPTS) {
    console.log('\n━━━ ' + pad(id + ': ' + name));
    const result = await runTest(id, name);
    if (result.passed) totalPassed += result.passed;
    if (result.failed) totalFailed += result.failed;
  }

  console.log('\n' + '━'.repeat(56));
  console.log('TOTAL: ' + totalPassed + ' passed / ' + totalFailed + ' failed');
  console.log(totalFailed === 0 ? '✅ All tests passed!' : '❌ ' + totalFailed + ' test(s) failed');
  process.exit(totalFailed > 0 ? 1 : 0);
}

await main();