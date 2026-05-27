// ========================================
// v1.3.0 Phase B.2 — Runtime Graph Store
// Virtualized graph over persistent memory tables
// ========================================

import { query } from './db.js';
import { scanMemoryFields, redactSecrets, SecurityError, ValidationError, NotFoundError } from './secret_scanner.js';

// ──────────────────────────────────────────────────────────────
// Node Types
// ──────────────────────────────────────────────────────────────

const NODE_TYPES = ['agent', 'memory', 'retrieval', 'decision'];
const EDGE_TYPES = [
  'created', 'retrieved', 'depends_on', 'supersedes',
  'contradicts', 'validates', 'blocks', 'references',
  'derived_from', 'archived_by', 'retrieved_by', 'decided',
];

// ──────────────────────────────────────────────────────────────
// createGraphNode(type, entityId, metadata)
// Resolves an existing entity into a graph node
// ──────────────────────────────────────────────────────────────

export async function createGraphNode(type, entityId, metadata = {}) {
  if (!NODE_TYPES.includes(type)) {
    throw new ValidationError(`Invalid node type: ${type}. Must be one of: ${NODE_TYPES.join(', ')}`);
  }

  // Scan metadata for secrets
  const metaScan = scanMemoryFields({ metadata });
  const safeMetadata = metaScan.hasSecrets
    ? { ...metadata, _graphSensitive: true, _redactedFields: metaScan.secrets.map(s => s.field) }
    : metadata;

  // Resolve entity from its table
  const node = await resolveNode(type, entityId);
  if (!node) {
    throw new NotFoundError(`${type} node ${entityId} not found`);
  }

  return {
    type,
    id: entityId,
    label: node.label,
    table: node.table,
    data: node.data,
    metadata: safeMetadata,
  };
}

async function resolveNode(type, entityId) {
  switch (type) {
    case 'agent': {
      const r = await query(`SELECT name, agent_type, description FROM agents WHERE id = $1`, [entityId]);
      return r.rows.length > 0
        ? { label: r.rows[0].name, table: 'agents', data: r.rows[0] }
        : null;
    }
    case 'memory': {
      const r = await query(
        `SELECT title, memory_type, agent_name, is_archived FROM agent_memories WHERE id = $1`,
        [entityId]
      );
      return r.rows.length > 0
        ? { label: r.rows[0].title, table: 'agent_memories', data: r.rows[0] }
        : null;
    }
    case 'retrieval': {
      const r = await query(
        `SELECT query_text, mode, agent_name FROM retrieval_history WHERE id = $1`,
        [entityId]
      );
      return r.rows.length > 0
        ? { label: r.rows[0].query_text?.slice(0, 80) || '(redacted)', table: 'retrieval_history', data: r.rows[0] }
        : null;
    }
    case 'decision': {
      const r = await query(
        `SELECT rule_name, decision, agent_name FROM governance_audit_log WHERE id = $1`,
        [entityId]
      );
      return r.rows.length > 0
        ? { label: `${r.rows[0].rule_name} → ${r.rows[0].decision}`, table: 'governance_audit_log', data: r.rows[0] }
        : null;
    }
    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────
// createGraphEdge(fromNode, toNode, relationType, metadata)
// Creates a virtual edge — uses memory_edges for memory-memory
// ──────────────────────────────────────────────────────────────

export async function createGraphEdge(fromNode, toNode, relationType, metadata = {}) {
  if (!EDGE_TYPES.includes(relationType)) {
    throw new ValidationError(`Invalid edge type: ${relationType}. Must be one of: ${EDGE_TYPES.join(', ')}`);
  }

  if (fromNode.id === toNode.id && fromNode.type === toNode.type) {
    throw new ValidationError('Cannot create self-referencing edge');
  }

  // Scan metadata for secrets
  const metaScan = scanMemoryFields({ metadata });
  if (metaScan.hasSecrets) {
    throw new SecurityError(metaScan.secrets);
  }

  // Memory-to-memory edges are stored in memory_edges
  if (fromNode.type === 'memory' && toNode.type === 'memory') {
    const result = await query(
      `INSERT INTO memory_edges (from_memory_id, to_memory_id, relation_type, weight, metadata)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (from_memory_id, to_memory_id, relation_type) DO UPDATE
         SET weight = EXCLUDED.weight, metadata = EXCLUDED.metadata
       RETURNING *`,
      [fromNode.id, toNode.id, relationType, metadata.weight ?? 1.0, JSON.stringify(metadata)]
    );
    return mapMemoryEdge(result.rows[0]);
  }

  // Cross-entity edges go into memory_edges if one side is a memory
  // For other cross-entity edges, we return a virtual edge (not persisted)
  if (fromNode.type === 'memory' || toNode.type === 'memory') {
    const fromMemId = fromNode.type === 'memory' ? fromNode.id : toNode.id;
    const toMemId = toNode.type === 'memory' ? toNode.id : fromNode.id;
    // Store the cross-entity edge in memory_edges with metadata tracking the other entity
    return createGraphEdge(
      { type: 'memory', id: fromNode.type === 'memory' ? fromNode.id : toNode.id },
      { type: 'memory', id: toNode.type === 'memory' ? toNode.id : fromNode.id },
      relationType,
      {
        ...metadata,
        _crossEntity: true,
        _fromType: fromNode.type,
        _fromId: fromNode.id,
        _toType: toNode.type,
        _toId: toNode.id,
      }
    );
  }

  // Pure non-memory edges: return virtual edge
  return {
    id: `virtual-${Date.now()}`,
    fromType: fromNode.type,
    fromId: fromNode.id,
    toType: toNode.type,
    toId: toNode.id,
    relationType,
    weight: metadata.weight ?? 1.0,
    metadata,
    isVirtual: true,
  };
}

// ──────────────────────────────────────────────────────────────
// getMemoryGraph(memoryId, options) → Graph
// Returns graph centered on a memory with connected nodes/edges
// ──────────────────────────────────────────────────────────────

export async function getMemoryGraph(memoryId, options = {}) {
  const { depth = 2, includeArchived = false, includeRetrievals = true } = options;

  // Verify memory exists
  const memResult = await query(
    `SELECT * FROM agent_memories WHERE id = $1${includeArchived ? '' : ' AND is_archived = false'}`,
    [memoryId]
  );
  if (memResult.rows.length === 0) throw new NotFoundError(`Memory ${memoryId} not found`);
  const centerMemory = memResult.rows[0];

  const nodes = [{ type: 'memory', id: memoryId, label: centerMemory.title, data: centerMemory }];
  const edges = [];

  // Add agent node
  try {
    const agent = await resolveNode('agent', centerMemory.agent_id);
    if (agent) {
      nodes.push({ type: 'agent', id: centerMemory.agent_id, label: agent.label, data: agent.data });
      edges.push({
        id: `fwd-agent-${centerMemory.agent_id}-${memoryId}`,
        fromType: 'agent', fromId: centerMemory.agent_id,
        toType: 'memory', toId: memoryId,
        relationType: 'created', weight: 1.0, metadata: {},
      });
    }
  } catch (_) {}

  // Get memory edges
  const edgeResult = await query(
    `SELECT * FROM memory_edges WHERE from_memory_id = $1 OR to_memory_id = $1`,
    [memoryId]
  );

  for (const e of edgeResult.rows) {
    edges.push(mapMemoryEdge(e));
    const otherId = e.from_memory_id === memoryId ? e.to_memory_id : e.from_memory_id;
    try {
      const other = await resolveNode('memory', otherId);
      if (other) {
        nodes.push({ type: 'memory', id: otherId, label: other.label, data: other.data });
      }
    } catch (_) {}
  }

  // Add retrieval edges
  if (includeRetrievals) {
    const retResult = await query(
      `SELECT id, query_text, mode FROM retrieval_history
       WHERE retrieved_memory_ids @> ARRAY[$1]::uuid[]
       ORDER BY created_at DESC LIMIT 10`,
      [memoryId]
    );
    for (const r of retResult.rows) {
      nodes.push({ type: 'retrieval', id: r.id, label: r.query_text?.slice(0, 60) || '(redacted)', data: r });
      edges.push({
        id: `fwd-ret-${r.id}-${memoryId}`,
        fromType: 'retrieval', fromId: r.id,
        toType: 'memory', toId: memoryId,
        relationType: 'retrieved', weight: 0.5, metadata: { mode: r.mode },
      });
    }
  }

  return { nodes, edges };
}

// ──────────────────────────────────────────────────────────────
// getAgentGraph(agentName, options) → Graph
// Returns all memories + edges for an agent
// ──────────────────────────────────────────────────────────────

export async function getAgentGraph(agentName, options = {}) {
  const { limit = 50, includeArchived = false } = options;

  // Get agent
  const agentResult = await query(`SELECT * FROM agents WHERE name = $1`, [agentName]);
  if (agentResult.rows.length === 0) throw new NotFoundError(`Agent ${agentName} not found`);
  const agent = agentResult.rows[0];

  const nodes = [{ type: 'agent', id: agent.id, label: agent.name, data: agent }];
  const edges = [];

  // Get memories
  const memResult = await query(
    `SELECT * FROM agent_memories WHERE agent_id = $1
     ${includeArchived ? '' : ' AND is_archived = false'}
     ORDER BY created_at DESC LIMIT $2`,
    [agent.id, limit]
  );

  const memoryIds = new Set();
  for (const m of memResult.rows) {
    memoryIds.add(m.id);
    nodes.push({ type: 'memory', id: m.id, label: m.title, data: m });
    edges.push({
      id: `fwd-agent-${agent.id}-${m.id}`,
      fromType: 'agent', fromId: agent.id,
      toType: 'memory', toId: m.id,
      relationType: 'created', weight: 1.0, metadata: { memoryType: m.memory_type },
    });
  }

  // Get edges between agent's memories
  if (memoryIds.size > 0) {
    const edgeResult = await query(
      `SELECT * FROM memory_edges
       WHERE from_memory_id = ANY($1) OR to_memory_id = ANY($1)`,
      [Array.from(memoryIds)]
    );
    for (const e of edgeResult.rows) {
      if (memoryIds.has(e.from_memory_id) && memoryIds.has(e.to_memory_id)) {
        edges.push(mapMemoryEdge(e));
      }
    }
  }

  return { nodes, edges };
}

// ──────────────────────────────────────────────────────────────
// getDecisionTrail(memoryId) → Decision[]
// Returns governance decisions related to a memory
// ──────────────────────────────────────────────────────────────

export async function getDecisionTrail(memoryId) {
  const memory = await resolveNode('memory', memoryId);
  if (!memory) throw new NotFoundError(`Memory ${memoryId} not found`);

  // Get retrievals that touched this memory
  const retResult = await query(
    `SELECT id, query_text, mode, created_at
     FROM retrieval_history
     WHERE $1::uuid = ANY(retrieved_memory_ids)
     ORDER BY created_at DESC`,
    [memoryId]
  );

  // For each retrieval, find related governance decisions
  const decisions = [];
  for (const ret of retResult.rows) {
    // We look for governance decisions that happened around the same time
    const govResult = await query(
      `SELECT * FROM governance_audit_log
       WHERE created_at >= $1::timestamptz - INTERVAL '5 minutes'
         AND created_at <= $1::timestamptz + INTERVAL '5 minutes'
       ORDER BY created_at DESC`,
      [ret.created_at]
    );

    for (const g of govResult.rows) {
      decisions.push({
        decision: g,
        triggeredBy: {
          type: 'retrieval',
          id: ret.id,
          query: ret.query_text,
        },
        memory: {
          id: memoryId,
          title: memory.label,
        },
      });
    }
  }

  // Also get decisions that mention the memory's title or agent
  const titleWords = memory.label.split(/\s+/).filter(w => w.length > 3);
  if (titleWords.length > 0) {
    const likeClauses = titleWords.map((_, i) => `evidence::text ILIKE $${i + 1}`);
    const govResult = await query(
      `SELECT * FROM governance_audit_log
       WHERE (${likeClauses.join(' OR ')})
       ORDER BY created_at DESC LIMIT 10`,
      titleWords.map(w => `%${w}%`)
    );
    for (const g of govResult.rows) {
      if (!decisions.some(d => d.decision.id === g.id)) {
        decisions.push({
          decision: g,
          triggeredBy: null,
          memory: { id: memoryId, title: memory.label },
        });
      }
    }
  }

  return decisions;
}

// ──────────────────────────────────────────────────────────────
// getRetrievalTrail(queryHash) → RetrievalNode[]
// Returns retrieval history + graph for a query hash
// ──────────────────────────────────────────────────────────────

export async function getRetrievalTrail(queryHash) {
  const retResult = await query(
    `SELECT * FROM retrieval_history WHERE query_hash = $1 ORDER BY created_at DESC LIMIT 20`,
    [queryHash]
  );

  const trail = [];
  for (const ret of retResult.rows) {
    const memories = [];
    const docPaths = ret.retrieved_doc_paths || [];
    const memoryIds = ret.retrieved_memory_ids || [];

    for (const mid of memoryIds) {
      try {
        const m = await resolveNode('memory', mid);
        if (m) memories.push({ id: mid, title: m.label, data: m.data });
      } catch (_) {}
    }

    trail.push({
      retrievalId: ret.id,
      queryText: ret.query_text,
      mode: ret.mode,
      memories,
      docs: docPaths,
      cacheHit: ret.cache_hit,
      latencyMs: ret.latency_ms,
      governanceViolations: ret.governance_violations,
      createdAt: ret.created_at,
    });
  }

  return trail;
}

// ──────────────────────────────────────────────────────────────
// getRelatedMemories(memoryId, relationTypes) → Memory[]
// ──────────────────────────────────────────────────────────────

export async function getRelatedMemories(memoryId, relationTypes = null) {
  let sql = `SELECT me.*, m.title as to_title, m.memory_type as to_type
     FROM memory_edges me
     JOIN agent_memories m ON m.id = me.to_memory_id
     WHERE me.from_memory_id = $1`;
  const params = [memoryId];

  if (relationTypes && relationTypes.length > 0) {
    params.push(relationTypes);
    sql += ` AND me.relation_type = ANY($2)`;
  }

  const result = await query(sql, params);
  return result.rows.map(r => ({
    edgeId: r.id,
    fromMemoryId: r.from_memory_id,
    toMemoryId: r.to_memory_id,
    relationType: r.relation_type,
    weight: parseFloat(r.weight),
    toTitle: r.to_title,
    toType: r.to_type,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
  }));
}

// ──────────────────────────────────────────────────────────────
// findContradictions(memoryId) → Edge[]
// Returns edges where this memory contradicts others
// ──────────────────────────────────────────────────────────────

export async function findContradictions(memoryId) {
  // Find outgoing contradictions
  const outResult = await query(
    `SELECT me.*, m.title as other_title
     FROM memory_edges me
     JOIN agent_memories m ON m.id = me.to_memory_id
     WHERE me.from_memory_id = $1 AND me.relation_type = 'contradicts'`,
    [memoryId]
  );

  // Find incoming contradictions
  const inResult = await query(
    `SELECT me.*, m.title as other_title
     FROM memory_edges me
     JOIN agent_memories m ON m.id = me.from_memory_id
     WHERE me.to_memory_id = $1 AND me.relation_type = 'contradicts'`,
    [memoryId]
  );

  return {
    contradicts: outResult.rows.map(r => ({ edgeId: r.id, memoryId: r.to_memory_id, title: r.other_title, direction: 'outgoing' })),
    contradictedBy: inResult.rows.map(r => ({ edgeId: r.id, memoryId: r.from_memory_id, title: r.other_title, direction: 'incoming' })),
  };
}

// ──────────────────────────────────────────────────────────────
// findSupersededMemories(memoryId) → Edge[]
// ──────────────────────────────────────────────────────────────

export async function findSupersededMemories(memoryId) {
  // This memory supersedes others
  const outResult = await query(
    `SELECT me.*, m.title as superseded_title
     FROM memory_edges me
     JOIN agent_memories m ON m.id = me.to_memory_id
     WHERE me.from_memory_id = $1 AND me.relation_type = 'supersedes'`,
    [memoryId]
  );

  // This memory is superseded by others
  const inResult = await query(
    `SELECT me.*, m.title as superseding_title
     FROM memory_edges me
     JOIN agent_memories m ON m.id = me.from_memory_id
     WHERE me.to_memory_id = $1 AND me.relation_type = 'supersedes'`,
    [memoryId]
  );

  return {
    supersedes: outResult.rows.map(r => ({ edgeId: r.id, memoryId: r.to_memory_id, title: r.superseded_title })),
    supersededBy: inResult.rows.map(r => ({ edgeId: r.id, memoryId: r.from_memory_id, title: r.superseding_title })),
  };
}

// ──────────────────────────────────────────────────────────────
// deleteGraphEdge(edgeId) → boolean
// Cannot delete governance edges
// ──────────────────────────────────────────────────────────────

export async function deleteGraphEdge(edgeId) {
  // Check if edge is governance-related
  const edgeResult = await query(
    `SELECT me.*, m.memory_type as from_type, m2.memory_type as to_type
     FROM memory_edges me
     LEFT JOIN agent_memories m ON m.id = me.from_memory_id
     LEFT JOIN agent_memories m2 ON m2.id = me.to_memory_id
     WHERE me.id = $1`,
    [edgeId]
  );

  if (edgeResult.rows.length === 0) {
    throw new NotFoundError(`Edge ${edgeId} not found`);
  }

  const edge = edgeResult.rows[0];
  const isGovernanceEdge =
    edge.relation_type === 'validates' ||
    edge.relation_type === 'blocks' ||
    edge.from_type === 'governance' ||
    edge.to_type === 'governance';

  if (isGovernanceEdge) {
    throw new Error('Governance-related edges cannot be deleted');
  }

  await query(`DELETE FROM memory_edges WHERE id = $1`, [edgeId]);
  return true;
}

// ──────────────────────────────────────────────────────────────
// getGraphSummary(type, options) → summary stats
// ──────────────────────────────────────────────────────────────

export async function getGraphSummary(options = {}) {
  const { agentName, includeArchived = false } = options;

  let memFilter = includeArchived ? '' : ' AND is_archived = false';
  let agentFilter = agentName ? ` AND agent_name = $1` : '';
  const params = agentName ? [agentName] : [];

  const memCount = await query(
    `SELECT COUNT(*) as c FROM agent_memories WHERE 1=1${memFilter}${agentFilter}`,
    params
  );

  const edgeCount = await query(
    `SELECT COUNT(*) as c FROM memory_edges`,
    []
  );

  const govCount = await query(
    `SELECT COUNT(*) as c FROM governance_audit_log${agentName ? ' WHERE agent_name = $1' : ''}`,
    agentName ? [agentName] : []
  );

  // Top relations
  const topRelations = await query(
    `SELECT relation_type, COUNT(*) as cnt
     FROM memory_edges GROUP BY relation_type ORDER BY cnt DESC`,
    []
  );

  return {
    totalMemories: parseInt(memCount.rows[0].c),
    totalEdges: parseInt(edgeCount.rows[0].c),
    totalDecisions: parseInt(govCount.rows[0].c),
    topRelations: topRelations.rows.map(r => ({ type: r.relation_type, count: parseInt(r.cnt) })),
    agentFilter: agentName || 'all',
    archivedIncluded: includeArchived,
  };
}

// ──────────────────────────────────────────────────────────────
// Map memory_edges row to graph edge
// ──────────────────────────────────────────────────────────────

function mapMemoryEdge(row) {
  return {
    id: row.id,
    fromType: 'memory',
    fromId: row.from_memory_id,
    toType: 'memory',
    toId: row.to_memory_id,
    relationType: row.relation_type,
    weight: parseFloat(row.weight),
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Auto-create edges when memories are created (called by memory_store.js)
// ──────────────────────────────────────────────────────────────

export async function onCreateMemory(memory, agentId) {
  // Agent → Memory edge is virtual (via agent_id FK)
  return {
    type: 'agent_to_memory',
    from: { type: 'agent', id: agentId },
    to: { type: 'memory', id: memory.id },
    relationType: 'created',
    status: 'fk_resolved',
  };
}

export async function onArchiveMemory(memoryId, reason) {
  // Log archive as an edge from memory to a virtual archive decision
  return {
    type: 'archive',
    memoryId,
    reason,
    timestamp: new Date().toISOString(),
    status: 'logged',
  };
}

// ──────────────────────────────────────────────────────────────
// Export for convenience
// ──────────────────────────────────────────────────────────────

export { NODE_TYPES, EDGE_TYPES, resolveNode, mapMemoryEdge };
