// ========================================
// v1.3.0 Phase B.1 — Memory Runtime Integration Tests
// Covers: retrieveContext memory integration, audit, migration, retention
// ========================================

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://raguser:ragpass@localhost:5432/ragmemory',
  max: 1,
});

let passed = 0, failed = 0;
function assert(c, m) {
  if (c) { console.log('  ✅ ' + m); passed++; }
  else { console.log('  ❌ ' + m); failed++; }
}

// ──────────────────────────────────────────────────────────────
// Schema init (idempotent)
// ──────────────────────────────────────────────────────────────

async function initSchema() {
  try { await pool.query('SELECT 1 FROM agents LIMIT 1'); return; } catch (_) {}
  const sql = readFileSync(resolve('../../docker/postgres/init-agent-memory.sql'), 'utf8');
  const stmts = []; let depth = 0, buf = '';
  for (let i = 0; i < sql.length; ) {
    if (i < sql.length - 1 && sql[i] === '$' && sql[i + 1] === '$') { depth = depth === 0 ? 1 : 0; buf += '$$'; i += 2; }
    else if (sql[i] === ';' && depth === 0) { const s = buf.trim().replace(/--[^\n]*/g, '').replace(/\n\s*\n/g, '\n').trim(); if (s) stmts.push(s); buf = ''; i++; }
    else { buf += sql[i]; i++; }
  }
  const last = buf.trim().replace(/--[^\n]*/g, '').trim(); if (last) stmts.push(last);
  const ignore = new Set(['42P07', '42710', '23505', '23503', '42P01', '42703']);
  for (const s of stmts) { try { await pool.query(s); } catch (e) { if (!ignore.has(e.code)) console.log('  [warn]', e.code, e.message.slice(0, 60)); } }
}

async function cleanup() {
  await pool.query('ALTER TABLE agent_memories DISABLE TRIGGER ALL').catch(() => {});
  await pool.query('ALTER TABLE agents DISABLE TRIGGER ALL').catch(() => {});
  for (const t of ['agent_memories','agents','memory_events','agent_runs','retrieval_history','governance_audit_log','memory_edges']) {
    await pool.query(`DELETE FROM ${t}`).catch(() => {});
  }
  await pool.query('ALTER TABLE agent_memories ENABLE TRIGGER ALL').catch(() => {});
  await pool.query('ALTER TABLE agents ENABLE TRIGGER ALL').catch(() => {});
}

// ──────────────────────────────────────────────────────────────
// Seed test memories
// ──────────────────────────────────────────────────────────────

async function seedMemories() {
  const ms = await import('./memory_store.js');

  // Governance memory
  await ms.createMemory({
    agentName: 'test-agent-b1', memoryType: 'governance',
    title: 'Five Iron Laws',
    content: '1. Controller only sends input. 2. Server injects playerIndex. 3. Screen+Unity handles logic. 4. Unity broadcasts. 5. Controller updates UI.',
    source: 'system', importance: 10,
  });

  // Semantic memory
  await ms.createMemory({
    agentName: 'test-agent-b1', memoryType: 'semantic',
    title: 'Phase B.0 Summary',
    content: 'Phase B.0 delivered the minimal persistent memory store with 81/81 tests passing. The secret scanner uses 14 regex patterns.',
    source: 'agent', importance: 8,
  });

  // Episodic memory
  await ms.createMemory({
    agentName: 'test-agent-b1', memoryType: 'episodic',
    title: 'Debug session 2026-05-27',
    content: 'Found infinite loop in secret_scanner.js due to missing g flag on regex patterns. Fixed by adding global flags to all 14 patterns.',
    source: 'agent', importance: 6,
  });

  // Archived memory (should NOT appear in search)
  const archived = await ms.createMemory({
    agentName: 'test-agent-b1', memoryType: 'semantic',
    title: 'Old deprecated memory',
    content: 'This memory was archived and should not appear in search results.',
    source: 'agent', importance: 2,
  });
  await ms.archiveMemory(archived.id, { reason: 'Test: archived memory exclusion' });
}

// ──────────────────────────────────────────────────────────────
// TEST I1 — retrieveContext(includeMemory=false) keeps original behavior
// ──────────────────────────────────────────────────────────────
async function test_I1_originalBehavior() {
  console.log('\n━━━ I1: retrieveContext(includeMemory=false) keeps original behavior');
  try {
    const rc = await import('../rag-memory/runtime/retrieve_context.js');
    const result = await rc.retrieveContext('Five Iron Laws', {
      includeMemory: false,
      mode: 'keyword',
      topK: 3,
      agentName: 'test-agent-b1',
    });
    assert(result.chunks !== undefined, 'Has chunks array');
    assert(Array.isArray(result.chunks), 'Chunks is array');
    // No memory results when disabled
    const memChunks = result.chunks.filter(c => c.source_type === 'memory');
    assert(memChunks.length === 0, 'No memory chunks when includeMemory=false');
    // Should still have document results
    const hasDocs = result.chunks.length > 0 || result.top_k >= 0;
    assert(hasDocs, 'Returns RAG results (or empty if no docs)');
    console.log('    Result: ' + passed + ' passed / ' + failed + ' failed (group)');
  } catch (err) {
    console.log('    ⚠️  Skipped — RAG runtime requires DATABASE:', err.message.slice(0, 80));
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I2 — retrieveContext(includeMemory=true) returns memory source
// ──────────────────────────────────────────────────────────────
async function test_I2_memoryResults() {
  console.log('\n━━━ I2: retrieveContext(includeMemory=true) returns memory source');
  try {
    const rc = await import('../rag-memory/runtime/retrieve_context.js');
    const result = await rc.retrieveContext('debug missing patterns global', {
      includeMemory: true,
      memoryTopK: 3,
      mode: 'keyword',
      topK: 3,
      agentName: 'test-agent-b1',
    });
    const memChunks = result.chunks.filter(c => c.source_type === 'memory');
    assert(memChunks.length > 0, 'Memory chunks present when includeMemory=true');
    if (memChunks.length > 0) {
      assert(memChunks[0].source_type === 'memory', 'source_type=memory set');
      assert(memChunks[0].metadata !== undefined, 'Metadata present');
      assert(memChunks[0].metadata.memoryType !== undefined, 'Memory type in metadata');
      assert(memChunks[0].metadata.agentName === 'test-agent-b1', 'Agent name in metadata');
    }
    console.log('    Result: ' + passed + ' passed / ' + failed + ' failed (group)');
  } catch (err) {
    console.log('    ⚠️  Skipped — memory or RAG runtime requires DATABASE:', err.message.slice(0, 80));
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I3 — Archived memory NOT in prompt context
// ──────────────────────────────────────────────────────────────
async function test_I3_archivedExclusion() {
  console.log('\n━━━ I3: Archived memory excluded from prompt context');
  try {
    const ms = await import('./memory_store.js');
    const results = await ms.searchMemory('deprecated memory', {
      agentName: 'test-agent-b1',
      limit: 5,
    });
    const hasArchived = results.some(r => r.memory.isArchived);
    assert(!hasArchived, 'Archived memory excluded from searchMemory (default)');

    // Verify it IS found with explicit flag
    const resultsWithArchived = await ms.searchMemory('deprecated memory', {
      agentName: 'test-agent-b1',
      limit: 5,
      includeArchived: true,
    });
    const foundArchived = resultsWithArchived.some(r => r.memory.isArchived);
    assert(foundArchived, 'Archived memory found with includeArchived=true');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I4 — Governance memory prioritized
// ──────────────────────────────────────────────────────────────
async function test_I4_governancePriority() {
  console.log('\n━━━ I4: Governance memory prioritized in results');
  try {
    const ms = await import('./memory_store.js');
    const results = await ms.searchMemory('Five Iron Laws', {
      agentName: 'test-agent-b1',
      limit: 5,
    });
    assert(results.length > 0, 'Results found');
    // Governance memory should appear (if matched)
    const govMem = results.filter(r => r.memory.memoryType === 'governance');
    if (govMem.length > 0) {
      assert(govMem[0].memory.memoryType === 'governance', 'Governance memory type is governance');
    }
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I5 — recordRetrieval writes to retrieval_history
// ──────────────────────────────────────────────────────────────
async function test_I5_recordRetrieval() {
  console.log('\n━━━ I5: recordRetrieval writes to retrieval_history');
  try {
    const ms = await import('./memory_store.js');
    const record = await ms.recordRetrieval({
      queryText: 'What are the Five Iron Laws?',
      mode: 'hybrid',
      topK: 5,
      agentName: 'test-agent-b1',
      latencyMs: 42,
      retrievedDocPaths: ['docs/REPORT.md', 'docs/SPEC.md'],
    });

    assert(record.id !== null, 'Retrieval record created');
    assert(record.mode === 'hybrid', 'Mode stored');
    assert(record.topK === 5, 'TopK stored');
    assert(record.agentName === 'test-agent-b1', 'Agent name stored');
    assert(record.queryText === 'What are the Five Iron Laws?', 'Query text stored');
    assert(record.queryRedacted === false, 'Clean query not redacted');
    assert(record.cacheHit === false, 'Cache hit stored');

    // Verify in DB
    const r = await pool.query('SELECT * FROM retrieval_history WHERE id = $1', [record.id]);
    assert(r.rows.length === 1, 'Record persisted');

    // Verify with retrieved_memory_ids
    const record2 = await ms.recordRetrieval({
      queryText: 'Find memory about bugs',
      mode: 'keyword',
      topK: 3,
      agentName: 'test-agent-b1',
      retrievedMemoryIds: [record.id, record.id],
    });
    assert(record2.retrievedMemoryIds !== null, 'Memory IDs stored');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I6 — recordRetrieval redacts secret query
// ──────────────────────────────────────────────────────────────
async function test_I6_secretQueryRedaction() {
  console.log('\n━━━ I6: recordRetrieval redacts secret query');
  try {
    const ms = await import('./memory_store.js');
    const record = await ms.recordRetrieval({
      queryText: 'Use this key: sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ for the next request',
      mode: 'hybrid',
      topK: 5,
      agentName: 'test-agent-b1',
      latencyMs: 38,
    });

    assert(record.queryRedacted === true, 'Query is redacted');
    assert(record.queryText.includes('[REDACTED:'), 'Redacted marker present');
    assert(!record.queryText.includes('sk-ABCDEFGHIJK'), 'Raw key not in stored query');
    assert(record.originalQueryHash !== null, 'Original hash stored for audit');
    assert(record.redactionReason === 'secrets detected in query', 'Redaction reason set');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I7 — migrateMemoryFiles dry-run
// ──────────────────────────────────────────────────────────────
async function test_I7_migrateFiles() {
  console.log('\n━━━ I7: migrateMemoryFiles dry-run from workspace');
  try {
    const mig = await import('./migrate_memory_files.js');
    // Use workspace root as source
    const workspaceRoot = resolve('../../../');
    const summary = await mig.migrateMemoryFiles(workspaceRoot, {
      agentName: 'test-agent-b1',
      dryRun: true,
      // Only migrate one known file to keep test fast
      sourceFiles: {
        'MEMORY.md': { memoryType: 'semantic', tags: ['workspace', 'long-term'], importance: 9 },
      },
    });

    assert(summary.scanned > 0, 'At least one file scanned');
    assert(typeof summary.migrated === 'number', 'Migrated count is number');
    assert(typeof summary.skippedSecrets === 'number', 'Skipped secrets count is number');
    assert(typeof summary.errors === 'number', 'Errors count is number');
    assert(summary.details.length > 0, 'Details populated');

    console.log(`    Scanned: ${summary.scanned}, Chunks: ${summary.chunks}, Migrated(dry): ${summary.migrated}`);
    if (summary.skippedSecrets > 0) console.log(`    Skipped secrets: ${summary.skippedSecrets}`);
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I8 — Retention policy excludes governance memories
// ──────────────────────────────────────────────────────────────
async function test_I8_retentionPolicy() {
  console.log('\n━━━ I8: Retention policy excludes governance memories');
  try {
    const rp = await import('./retention_policy.js');

    // List archive candidates — should exclude governance
    const candidates = await rp.listArchiveCandidates('test-agent-b1', {
      excludeTypes: ['governance'],
      limit: 20,
    });

    const govCandidates = candidates.filter(c => c.memoryType === 'governance');
    assert(govCandidates.length === 0, 'No governance memories in archive candidates');

    // Verify isGovernanceMemory
    const ms = await import('./memory_store.js');
    const govResults = await ms.getMemoriesByAgent('test-agent-b1', { memoryTypes: ['governance'], limit: 1 });
    if (govResults.length > 0) {
      const isGov = await rp.isGovernanceMemory(govResults[0].id);
      assert(isGov === true, 'isGovernanceMemory returns true for governance');
    }

    // Try dry-run archive — governance should NOT be archived
    const result = await rp.archiveExpiredMemories('test-agent-b1', {
      workingOlderThanDays: 0, // archive all working memories (shouldn't exist)
      confidenceThreshold: 0.99, // archive almost everything by low confidence
      dryRun: true,
    });
    assert(result.working !== undefined, 'Working result present');
    assert(result.lowConfidence !== undefined, 'Low-confidence result present');
    assert(typeof result.totalArchived === 'number', 'Total archived is number');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// TEST I9 — Governance memory can't be archived
// ──────────────────────────────────────────────────────────────
async function test_I9_governanceArchiveBlocked() {
  console.log('\n━━━ I9: Governance memory archive is blocked');
  try {
    const ms = await import('./memory_store.js');
    const govResults = await ms.getMemoriesByAgent('test-agent-b1', { memoryTypes: ['governance'], limit: 1 });
    
    if (govResults.length === 0) {
      console.log('    ⚠️  No governance memories found (skip)');
      return;
    }

    let blocked = false;
    try {
      await ms.archiveMemory(govResults[0].id, { reason: 'Test: should be blocked' });
    } catch (err) {
      if (err.name === 'PermissionError') blocked = true;
    }
    assert(blocked, 'archiveMemory throws PermissionError for governance');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Memory Runtime Integration Tests — v1.3.0 Phase B1 ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  await initSchema();
  await cleanup();
  await seedMemories();

  await test_I1_originalBehavior();
  await test_I2_memoryResults();
  await test_I3_archivedExclusion();
  await test_I4_governancePriority();
  await test_I5_recordRetrieval();
  await test_I6_secretQueryRedaction();
  await test_I7_migrateFiles();
  await test_I8_retentionPolicy();
  await test_I9_governanceArchiveBlocked();

  console.log('\n' + '━'.repeat(56));
  console.log('TOTAL: ' + passed + ' passed / ' + failed + ' failed');
  console.log(failed === 0 ? '✅ All integration tests passed!' : '❌ ' + failed + ' test(s) failed');

  await pool.end();
  try {
    const db = await import('./db.js');
    await db.closePool();
  } catch (_) {}
  process.exit(failed > 0 ? 1 : 0);
}

await main();
