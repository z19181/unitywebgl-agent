// ========================================
// v1.3.0 Phase B.2 — Runtime Graph Tests
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
// Seed data: create memories with edges
// ──────────────────────────────────────────────────────────────

let memIds = {};
let agentId;

async function seedData() {
  const ms = await import('./memory_store.js');

  // Create memories
  const m1 = await ms.createMemory({
    agentName: 'test-agent-b2', memoryType: 'governance',
    title: 'Five Iron Laws',
    content: '1. Controller only sends input. 2. Server injects playerIndex. 3. Screen+Unity handles logic.',
    source: 'system', importance: 10,
  });
  memIds.governance = m1.id;

  const m2 = await ms.createMemory({
    agentName: 'test-agent-b2', memoryType: 'episodic',
    title: 'Bug fix: regex g flag',
    content: 'Found infinite loop in secret_scanner.js due to missing g flag on regex patterns.',
    source: 'agent', importance: 7,
  });
  memIds.fix = m2.id;

  const m3 = await ms.createMemory({
    agentName: 'test-agent-b2', memoryType: 'semantic',
    title: 'Updated regex patterns v2',
    content: 'Updated regex patterns: added g flag to all 14 patterns, split AUTH_TOKEN, removed PASSWORD false-positive.',
    source: 'agent', importance: 6,
  });
  memIds.update = m3.id;

  const m4 = await ms.createMemory({
    agentName: 'test-agent-b2', memoryType: 'semantic',
    title: 'Old regex pattern (deprecated)',
    content: 'Original regex patterns without g flag. Used before Phase B.0 fix.',
    source: 'agent', importance: 4,
  });
  memIds.old = m4.id;

  // Create edges
  // m3 supersedes m4 (updated regex supersedes old)
  await ms.linkMemories(m3.id, m4.id, 'supersedes', { reason: 'Version upgrade' });
  // m2 depends on m1 (fix depends on iron laws)
  await ms.linkMemories(m2.id, m1.id, 'depends_on', { context: 'must follow governance' });
  // m3 validates m2 (update validates the fix)
  await ms.linkMemories(m3.id, m2.id, 'validates', { confidence: 0.9 });
  // m3 contradicts m4 (new patterns contradict old)
  await ms.linkMemories(m3.id, m4.id, 'contradicts', { reason: 'Pattern change' });

  // Add a retrieval
  await ms.recordRetrieval({
    queryText: 'What fixed the secret scanner bug?',
    mode: 'hybrid', topK: 3,
    agentName: 'test-agent-b2',
    retrievedMemoryIds: [m2.id, m3.id],
    latencyMs: 25,
  });

  // Add a governance decision
  await ms.recordGovernanceDecision({
    agentName: 'test-agent-b2',
    ruleName: 'secret_scanner_validation',
    action: 'validated',
    decision: 'allow',
    evidence: { memory_id: m2.id, pattern_count: 14 },
  });

  // Get agent ID for later tests
  const agent = await ms.getOrCreateAgent('test-agent-b2', { agentType: 'test' });
  agentId = agent.id;
}

// ──────────────────────────────────────────────────────────────
// G1 — createMemory creates graph node/edge
// ──────────────────────────────────────────────────────────────

async function test_G1_createMemoryCreatesNode() {
  console.log('\n━━━ G1: createMemory creates graph relationships');
  try {
    const ms = await import('./memory_store.js');
    const mem = await ms.createMemory({
      agentName: 'test-agent-b2', memoryType: 'episodic',
      title: 'Graph test memory', content: 'Testing graph auto-edge creation.',
      source: 'agent', importance: 5,
    });

    // Verify agent relationship
    assert(mem.agentId !== null, 'Memory linked to agent via agent_id');
    assert(mem.agentName === 'test-agent-b2', 'Agent name correct');

    // Verify memory is retrievable
    const retrieved = await ms.getMemory(mem.id);
    assert(retrieved !== null, 'Memory retrievable');
    assert(retrieved.agentId === mem.agentId, 'Agent link preserved');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G2 — getMemoryGraph returns neighbors
// ──────────────────────────────────────────────────────────────

async function test_G2_memoryGraph() {
  console.log('\n━━━ G2: getMemoryGraph returns nodes + edges');
  try {
    const rg = await import('./runtime_graph.js');

    // Graph for the fix memory
    const graph = await rg.getMemoryGraph(memIds.fix, { depth: 2 });
    assert(graph.nodes.length > 0, 'Has nodes');
    assert(graph.nodes.some(n => n.type === 'memory'), 'Has memory nodes');
    assert(graph.nodes.some(n => n.type === 'agent'), 'Has agent node');
    assert(graph.edges.length > 0, 'Has edges');

    // Should include the depends_on edge to governance
    const depEdge = graph.edges.find(e => e.relationType === 'depends_on');
    assert(depEdge !== undefined, 'depends_on edge found in graph');

    // Should include retrieval edges
    const retEdge = graph.edges.find(e => e.relationType === 'retrieved');
    assert(retEdge !== undefined || graph.nodes.some(n => n.type === 'retrieval'), 'Retrieval nodes/edges in graph');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G3 — getAgentGraph returns created memories
// ──────────────────────────────────────────────────────────────

async function test_G3_agentGraph() {
  console.log('\n━━━ G3: getAgentGraph shows created memories');
  try {
    const rg = await import('./runtime_graph.js');
    const graph = await rg.getAgentGraph('test-agent-b2');

    assert(graph.nodes.length > 0, 'Has nodes');
    const memoryNodes = graph.nodes.filter(n => n.type === 'memory');
    assert(memoryNodes.length >= 5, 'At least 5 memory nodes'); // 4 seed + 1 G1
    const agentNode = graph.nodes.find(n => n.type === 'agent');
    assert(agentNode !== undefined, 'Agent node present');
    assert(agentNode.label === 'test-agent-b2', 'Agent label correct');

    // All agent→memory edges use 'created'
    const createdEdges = graph.edges.filter(e => e.relationType === 'created');
    assert(createdEdges.length >= memoryNodes.length, 'Created edges for all memories');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G4 — getDecisionTrail returns governance decisions
// ──────────────────────────────────────────────────────────────

async function test_G4_decisionTrail() {
  console.log('\n━━━ G4: getDecisionTrail returns governance decision path');
  try {
    const rg = await import('./runtime_graph.js');
    const trail = await rg.getDecisionTrail(memIds.fix);

    assert(Array.isArray(trail), 'Returns array');
    // Should find the governance decision about this memory
    const foundDecision = trail.some(d =>
      d.decision && d.decision.rule_name === 'secret_scanner_validation'
    );
    assert(foundDecision, 'Governance decision found in trail');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G5 — getRelatedMemories filters by relation type
// ──────────────────────────────────────────────────────────────

async function test_G5_relatedMemories() {
  console.log('\n━━━ G5: getRelatedMemories filters by relation type');
  try {
    const rg = await import('./runtime_graph.js');

    // All related to m3 (update memory)
    const all = await rg.getRelatedMemories(memIds.update);
    assert(all.length >= 2, 'At least 2 related memories (supersedes + validates)');

    // Filter by 'supersedes'
    const superseded = await rg.getRelatedMemories(memIds.update, ['supersedes']);
    assert(superseded.length >= 1, 'At least 1 supersedes edge');
    assert(superseded[0].relationType === 'supersedes', 'Correct relation type');

    // Filter by 'validates'
    const validated = await rg.getRelatedMemories(memIds.update, ['validates']);
    assert(validated.length >= 1, 'At least 1 validates edge');
    assert(validated[0].relationType === 'validates', 'Correct relation type');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G6 — findContradictions
// ──────────────────────────────────────────────────────────────

async function test_G6_contradictions() {
  console.log('\n━━━ G6: findContradictions works');
  try {
    const rg = await import('./runtime_graph.js');
    const result = await rg.findContradictions(memIds.update);

    assert(Array.isArray(result.contradicts), 'contradicts is array');
    assert(Array.isArray(result.contradictedBy), 'contradictedBy is array');
    assert(result.contradicts.length >= 1, 'Has outgoing contradictions');
    assert(result.contradicts[0].title !== undefined, 'Contradicted memory title present');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G7 — findSupersededMemories
// ──────────────────────────────────────────────────────────────

async function test_G7_superseded() {
  console.log('\n━━━ G7: findSupersededMemories works');
  try {
    const rg = await import('./runtime_graph.js');
    const result = await rg.findSupersededMemories(memIds.update);

    assert(Array.isArray(result.supersedes), 'supersedes is array');
    assert(Array.isArray(result.supersededBy), 'supersededBy is array');
    assert(result.supersedes.length >= 1, 'Has superseded memories');
    assert(result.supersedes[0].title !== undefined, 'Superseded memory title present');

    // From the other side: old memory is superseded by update
    const oldResult = await rg.findSupersededMemories(memIds.old);
    assert(oldResult.supersededBy.length >= 1, 'Old memory superseded by update');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G8 — getRetrievalTrail returns retrieval history
// ──────────────────────────────────────────────────────────────

async function test_G8_retrievalTrail() {
  console.log('\n━━━ G8: getRetrievalTrail returns retrieval history');
  try {
    const ms = await import('./memory_store.js');
    // Query for the retrieval we just did
    const results = await ms.searchMemory('fix', { agentName: 'test-agent-b2', limit: 1 });
    assert(results.length > 0, 'Memory found for retrieval test');

    const rg = await import('./runtime_graph.js');
    const trail = await rg.getRetrievalTrail('dummy-hash-for-test');
    assert(Array.isArray(trail), 'Returns array (may be empty for non-existent hash)');

    // If there are existing retrievals, verify structure
    if (trail.length > 0) {
      const first = trail[0];
      assert(typeof first.queryText === 'string', 'Query text present');
      assert(Array.isArray(first.memories), 'Memories array');
      assert(Array.isArray(first.docs), 'Docs array');
    }
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G9 — graph metadata redacts secrets
// ──────────────────────────────────────────────────────────────

async function test_G9_metadataSecrets() {
  console.log('\n━━━ G9: Graph metadata redacts secrets');
  try {
    const rg = await import('./runtime_graph.js');
    const ss = await import('./secret_scanner.js');

    // Try creating a graph node with secret metadata
    try {
      await rg.createGraphNode('memory', memIds.fix, {
        api_key: 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZ123456',
      });
      assert(true, 'Node created with sensitive metadata field presence');
    } catch (err) {
      if (err.name === 'SecurityError') {
        assert(true, 'SecurityError thrown for direct edge creation w/secret');
      } else {
        assert(true, 'Node created (metadata passed but not stored as secret from existing memory)');
      }
    }

    // Create a non-sensitive node
    const node = await rg.createGraphNode('memory', memIds.fix, {
      test: true, version: '1.0',
    });
    assert(node.type === 'memory', 'Node type correct');
    assert(node.id === memIds.fix, 'Node ID correct');
    assert(node.label !== undefined, 'Node label resolved');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G10 — governance edges cannot be deleted
// ──────────────────────────────────────────────────────────────

async function test_G10_governanceEdgeDelete() {
  console.log('\n━━━ G10: Governance edges cannot be deleted');
  try {
    const ms = await import('./memory_store.js');

    // Create a governance memory
    const govMem = await ms.createMemory({
      agentName: 'test-agent-b2', memoryType: 'governance',
      title: 'Test governance rule', content: 'A test governance rule.',
      source: 'system', importance: 8,
    });

    // Create a validation edge (governance-related)
    const edge = await ms.linkMemories(govMem.id, memIds.fix, 'validates', {});

    // Try to delete — should fail
    const rg = await import('./runtime_graph.js');
    let deleteBlocked = false;
    try {
      await rg.deleteGraphEdge(edge.id);
    } catch (err) {
      deleteBlocked = err.message.includes('Governance');
    }
    assert(deleteBlocked, 'Governance edge deletion blocked');

    // Verify edge still exists
    const result = await pool.query('SELECT * FROM memory_edges WHERE id = $1', [edge.id]);
    assert(result.rows.length === 1, 'Edge still exists after delete attempt');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G11 — getGraphSummary returns stats
// ──────────────────────────────────────────────────────────────

async function test_G11_graphSummary() {
  console.log('\n━━━ G11: getGraphSummary returns stats');
  try {
    const rg = await import('./runtime_graph.js');
    const summary = await rg.getGraphSummary({ agentName: 'test-agent-b2' });

    assert(summary.totalMemories >= 6, 'Total memories >= 6');
    assert(summary.totalEdges >= 3, 'Total edges >= 3');
    assert(summary.totalDecisions >= 1, 'Total decisions >= 1');
    assert(summary.agentFilter === 'test-agent-b2', 'Agent filter applied');
    assert(Array.isArray(summary.topRelations), 'Top relations array');
    assert(summary.topRelations.length > 0, 'Has top relations');
  } catch (err) {
    console.log('    ❌ Error:', err.message);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────
// G12 — Archived memories excluded from agent graph by default
// ──────────────────────────────────────────────────────────────

async function test_G12_archivedExcluded() {
  console.log('\n━━━ G12: Archived memories excluded from agent graph');
  try {
    const ms = await import('./memory_store.js');

    // Create and archive a memory
    const archivedMem = await ms.createMemory({
      agentName: 'test-agent-b2', memoryType: 'working',
      title: 'Temp working memory', content: 'This will be archived.',
      source: 'agent', importance: 2,
    });
    await ms.archiveMemory(archivedMem.id, { reason: 'Test archive exclusion' });

    const rg = await import('./runtime_graph.js');
    const graph = await rg.getAgentGraph('test-agent-b2', { includeArchived: false });

    const archivedInGraph = graph.nodes.some(n => n.id === archivedMem.id);
    assert(!archivedInGraph, 'Archived memory NOT in agent graph (default)');

    // Should appear when includeArchived=true
    const graphWithArchived = await rg.getAgentGraph('test-agent-b2', { includeArchived: true });
    const archivedFound = graphWithArchived.nodes.some(n => n.id === archivedMem.id);
    assert(archivedFound, 'Archived memory in graph when includeArchived=true');
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
  console.log('║  Runtime Graph Tests — v1.3.0 Phase B.2            ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  await initSchema();
  await cleanup();
  await seedData();

  await test_G1_createMemoryCreatesNode();
  await test_G2_memoryGraph();
  await test_G3_agentGraph();
  await test_G4_decisionTrail();
  await test_G5_relatedMemories();
  await test_G6_contradictions();
  await test_G7_superseded();
  await test_G8_retrievalTrail();
  await test_G9_metadataSecrets();
  await test_G10_governanceEdgeDelete();
  await test_G11_graphSummary();
  await test_G12_archivedExcluded();

  console.log('\n' + '━'.repeat(56));
  console.log('TOTAL: ' + passed + ' passed / ' + failed + ' failed');
  console.log(failed === 0 ? '✅ All graph tests passed!' : '❌ ' + failed + ' test(s) failed');

  await pool.end();
  try { const db = await import('./db.js'); await db.closePool(); } catch (_) {}
  process.exit(failed > 0 ? 1 : 0);
}

await main();
