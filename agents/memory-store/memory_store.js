// Agent Memory Store — v1.3.0 Phase B.0
// Core API: createMemory, getMemory, searchMemory, updateMemory,
// archiveMemory, linkMemories, recordRetrieval, recordGovernanceDecision

import { query, transaction } from './db.js';
import { scanMemoryFields, redactSecrets, hashOriginal, SecurityError, ValidationError, NotFoundError, PermissionError } from './secret_scanner.js';

// ──────────────────────────────────────────────────────────────
// AGENTS
// ──────────────────────────────────────────────────────────────

export async function getOrCreateAgent(name, metadata = {}) {
  const result = await query(
    `INSERT INTO agents (name, agent_type, description, config)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING id, name, agent_type, description, config, is_active, created_at, updated_at`,
    [
      name,
      metadata.agentType || 'system',
      metadata.description || null,
      JSON.stringify(metadata.config || {}),
    ]
  );
  return mapAgent(result.rows[0]);
}

export async function getAgent(name) {
  const result = await query(
    `SELECT id, name, agent_type, description, config, is_active, created_at, updated_at
     FROM agents WHERE name = $1`,
    [name]
  );
  return result.rows.length > 0 ? mapAgent(result.rows[0]) : null;
}

// ──────────────────────────────────────────────────────────────
// CREATE MEMORY
// ──────────────────────────────────────────────────────────────

export async function createMemory(input) {
  // 1. Resolve agent
  const agent = await getOrCreateAgent(input.agentName, { agentType: input.agentType || 'system' });

  // 2. Secret scan
  const scan = scanMemoryFields({
    content:  input.content,
    title:    input.title,
    tags:     input.tags,
    metadata: input.metadata,
  });

  let finalContent = input.content;
  let wasRedacted = false;

  if (scan.hasSecrets) {
    if (!input.allowRedacted) {
      throw new SecurityError(scan.secrets);
    }
    // Redact and store
    finalContent = redactSecrets(input.content);
    wasRedacted = true;
  }

  // 3. Governance memory guard
  if (input.memoryType === 'governance') {
    if (input.source !== 'system' && input.source !== 'migration') {
      throw new PermissionError(
        'Governance memories can only be created with source=system or source=migration'
      );
    }
  }

  // 4. Insert
  const result = await query(
    `INSERT INTO agent_memories
       (agent_id, agent_name, memory_type, title, content, source, source_file,
        importance, confidence, tags, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, agent_id, agent_name, memory_type, title, content, source,
               source_file, importance, confidence, tags, metadata, is_archived,
               created_at, updated_at, archived_at`,
    [
      agent.id,
      agent.name,
      input.memoryType,
      input.title,
      finalContent,
      input.source || 'agent',
      input.sourceFile || null,
      input.importance || 5,
      input.confidence ?? 1.00,
      JSON.stringify(input.tags || []),
      JSON.stringify({
        ...(input.metadata || {}),
        ...(wasRedacted ? { _redacted: true, _redactionReason: 'secrets detected' } : {}),
      }),
    ]
  );

  return mapMemory(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// GET MEMORY
// ──────────────────────────────────────────────────────────────

export async function getMemory(id, options = {}) {
  const includeArchived = options.includeArchived ?? false;
  
  let sql = `SELECT id, agent_id, agent_name, memory_type, title, content, source,
                    source_file, importance, confidence, tags, metadata, is_archived,
                    created_at, updated_at, archived_at
             FROM agent_memories WHERE id = $1`;
  
  if (!includeArchived) {
    sql += ` AND is_archived = false`;
  }
  
  const result = await query(sql, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const memory = mapMemory(result.rows[0]);
  
  // Defensive redaction at read time
  const scan = scanMemoryFields({ content: memory.content });
  if (scan.hasSecrets) {
    memory.content = redactSecrets(memory.content);
    memory._securityWarning = true;
  }
  
  return memory;
}

// ──────────────────────────────────────────────────────────────
// GET MEMORIES BY AGENT
// ──────────────────────────────────────────────────────────────

export async function getMemoriesByAgent(agentName, options = {}) {
  const {
    memoryTypes,
    includeArchived = false,
    tags,
    minImportance,
    since,
    limit = 50,
    offset = 0,
    orderBy = 'created_at',
    orderDir = 'DESC',
  } = options;

  const params = [agentName];
  let idx = 2;
  let sql = `SELECT id, agent_id, agent_name, memory_type, title, content, source,
                    source_file, importance, confidence, tags, metadata, is_archived,
                    created_at, updated_at, archived_at
             FROM agent_memories WHERE agent_name = $1`;

  if (!includeArchived) sql += ` AND is_archived = false`;

  if (memoryTypes && memoryTypes.length > 0) {
    sql += ` AND memory_type = ANY($${idx++})`;
    params.push(memoryTypes);
  }

  if (minImportance) {
    sql += ` AND importance >= $${idx++}`;
    params.push(minImportance);
  }

  if (since) {
    sql += ` AND created_at >= $${idx++}`;
    params.push(since);
  }

  const validOrderCols = { created_at: 'created_at', importance: 'importance', updated_at: 'updated_at' };
  const orderCol = validOrderCols[orderBy] || 'created_at';
  const dir = orderDir === 'ASC' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${orderCol} ${dir} LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(Math.min(limit, 200), offset);

  const result = await query(sql, params);
  return result.rows.map(mapMemory);
}

// ──────────────────────────────────────────────────────────────
// SEARCH MEMORY
// ──────────────────────────────────────────────────────────────

export async function searchMemory(queryText, options = {}) {
  const {
    agentName,
    memoryTypes,
    includeArchived = false,
    limit = 10,
    mode = 'keyword',
    minSimilarity = 0.3,
  } = options;

  // Keyword search: use PostgreSQL full-text search on title + content
  // Build query safely (no user input in column names)
  let sql = `
    SELECT id, agent_id, agent_name, memory_type, title, content, source,
           source_file, importance, confidence, tags, metadata, is_archived,
           created_at, updated_at, archived_at,
           ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) AS rank
    FROM agent_memories
    WHERE
      plainto_tsquery('english', $1) @@ to_tsvector('english', title || ' ' || content)
  `;
  const params = [queryText];
  let idx = 2;

  if (!includeArchived) sql += ` AND is_archived = false`;

  if (agentName) {
    sql += ` AND agent_name = $${idx++}`;
    params.push(agentName);
  }

  if (memoryTypes && memoryTypes.length > 0) {
    sql += ` AND memory_type = ANY($${idx++})`;
    params.push(memoryTypes);
  }

  sql += ` ORDER BY rank DESC LIMIT $${idx++}`;
  params.push(Math.min(limit, 50));

  const result = await query(sql, params);

  // Compute similarity score from rank (0-1 range)
  const maxRank = Math.max(...result.rows.map(r => parseFloat(r.rank) || 0), 0.001);
  return result.rows.map(row => {
    const similarity = Math.min(parseFloat(row.rank) / maxRank, 1.0);
    return {
      memory:  mapMemory(row),
      similarity,
      matchedTerms: queryText.split(/\s+/).filter(t => t.length > 2),
      reason: `Keyword match in "${row.title}"`,
    };
  }).filter(r => r.similarity >= minSimilarity);
}

// ──────────────────────────────────────────────────────────────
// UPDATE MEMORY
// ──────────────────────────────────────────────────────────────

export async function updateMemory(id, patch, actor = null) {
  const existing = await getMemory(id, { includeArchived: true });
  if (!existing) throw new NotFoundError(`Memory ${id} not found`);

  if (existing.isArchived) {
    throw new ValidationError('Cannot update archived memory');
  }

  let finalContent = patch.content !== undefined ? patch.content : existing.content;

  if (patch.content !== undefined) {
    const scan = scanMemoryFields({ content: patch.content });
    if (scan.hasSecrets) throw new SecurityError(scan.secrets);
  }

  const updates = [];
  const params = [];
  let idx = 1;

  if (patch.title !== undefined) {
    const scan = scanMemoryFields({ title: patch.title });
    if (scan.hasSecrets) throw new SecurityError(scan.secrets);
    updates.push(`title = $${idx++}`);
    params.push(patch.title);
  }

  if (patch.content !== undefined) {
    updates.push(`content = $${idx++}`);
    params.push(finalContent);
  }

  if (patch.importance !== undefined) {
    updates.push(`importance = $${idx++}`);
    params.push(patch.importance);
  }

  if (patch.tags !== undefined) {
    updates.push(`tags = $${idx++}`);
    params.push(JSON.stringify(patch.tags));
  }

  if (patch.metadata !== undefined) {
    const merged = { ...existing.metadata, ...patch.metadata };
    updates.push(`metadata = $${idx++}`);
    params.push(JSON.stringify(merged));
  }

  if (updates.length === 0) return existing;

  params.push(id);
  const result = await query(
    `UPDATE agent_memories SET ${updates.join(', ')} WHERE id = $${idx}
     RETURNING id, agent_id, agent_name, memory_type, title, content, source,
               source_file, importance, confidence, tags, metadata, is_archived,
               created_at, updated_at, archived_at`,
    params
  );

  return mapMemory(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// ARCHIVE MEMORY
// ──────────────────────────────────────────────────────────────

export async function archiveMemory(id, options = {}) {
  const existing = await getMemory(id, { includeArchived: true });
  if (!existing) throw new NotFoundError(`Memory ${id} not found`);

  if (existing.isArchived) return existing; // Idempotent

  if (existing.memoryType === 'governance') {
    throw new PermissionError('Governance memories cannot be archived');
  }

  if (!options.reason) {
    throw new ValidationError('Archive reason is required for audit trail');
  }

  const result = await query(
    `UPDATE agent_memories
     SET is_archived = true, archived_at = NOW()
     WHERE id = $1
     RETURNING id, agent_id, agent_name, memory_type, title, content, source,
               source_file, importance, confidence, tags, metadata, is_archived,
               created_at, updated_at, archived_at`,
    [id]
  );

  return mapMemory(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// LINK MEMORIES
// ──────────────────────────────────────────────────────────────

export async function linkMemories(fromMemoryId, toMemoryId, relationType, metadata = {}) {
  if (fromMemoryId === toMemoryId) {
    throw new ValidationError('Cannot link a memory to itself');
  }

  const validTypes = ['created', 'retrieved', 'depends_on', 'supersedes', 'contradicts', 'validates', 'blocks', 'refines', 'retrieved_by'];
  if (!validTypes.includes(relationType)) {
    throw new ValidationError(`Invalid relation_type: ${relationType}. Must be one of: ${validTypes.join(', ')}`);
  }

  const result = await query(
    `INSERT INTO memory_edges (from_memory_id, to_memory_id, relation_type, weight, metadata)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (from_memory_id, to_memory_id, relation_type) DO UPDATE
       SET weight = EXCLUDED.weight, metadata = EXCLUDED.metadata
     RETURNING id, from_memory_id, to_memory_id, relation_type, weight, metadata, created_at`,
    [
      fromMemoryId,
      toMemoryId,
      relationType,
      metadata.weight ?? 1.0,
      JSON.stringify(metadata),
    ]
  );

  return mapEdge(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// UNLINK MEMORIES
// ──────────────────────────────────────────────────────────────

export async function unlinkMemories(fromMemoryId, toMemoryId, relationType) {
  const result = await query(
    `DELETE FROM memory_edges
     WHERE from_memory_id = $1 AND to_memory_id = $2 AND relation_type = $3`,
    [fromMemoryId, toMemoryId, relationType]
  );
  return result.rowCount > 0;
}

// ──────────────────────────────────────────────────────────────
// RECORD RETRIEVAL
// ──────────────────────────────────────────────────────────────

export async function recordRetrieval(input) {
  // Secret scan the query
  const scan = scanMemoryFields({ content: input.queryText });
  let finalQueryText = input.queryText;
  let queryRedacted = false;
  let redactionReason = null;
  let originalQueryHash = null;

  if (scan.hasSecrets) {
    finalQueryText = redactSecrets(input.queryText);
    queryRedacted = true;
    redactionReason = 'secrets detected in query';
    originalQueryHash = hashOriginal(input.queryText);
  }

  const result = await query(
    `INSERT INTO retrieval_history
       (query_text, query_hash, mode, top_k, retrieved_memory_ids, retrieved_doc_paths,
        agent_name, agent_run_id, latency_ms, cache_hit, context_size_chars,
        governance_violations, query_redacted, redaction_reason, original_query_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      finalQueryText,
      hashOriginal(finalQueryText),
      input.mode || 'keyword',
      input.topK || 5,
      input.retrievedMemoryIds || null,
      input.retrievedDocPaths || null,
      input.agentName || null,
      input.agentRunId || null,
      input.latencyMs || null,
      input.cacheHit || false,
      input.contextSizeChars || null,
      input.governanceViolations || 0,
      queryRedacted,
      redactionReason,
      originalQueryHash,
    ]
  );

  return mapRetrieval(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// RECORD GOVERNANCE DECISION
// ──────────────────────────────────────────────────────────────

export async function recordGovernanceDecision(input) {
  // Secret scan query text
  let finalQueryText = input.queryText || null;
  if (input.queryText) {
    const scan = scanMemoryFields({ content: input.queryText });
    if (scan.hasSecrets) {
      finalQueryText = redactSecrets(input.queryText);
    }
  }

  let finalResponseExcerpt = input.responseExcerpt || null;
  if (input.responseExcerpt) {
    const scan = scanMemoryFields({ content: input.responseExcerpt });
    if (scan.hasSecrets) {
      finalResponseExcerpt = redactSecrets(input.responseExcerpt);
    }
  }

  const result = await query(
    `INSERT INTO governance_audit_log
       (agent_name, agent_run_id, rule_name, action, decision, evidence,
        query_text, response_excerpt, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, agent_name, agent_run_id, rule_name, action, decision,
               evidence, query_text, response_excerpt, metadata, created_at`,
    [
      input.agentName || null,
      input.agentRunId || null,
      input.ruleName,
      input.action,
      input.decision,
      JSON.stringify(input.evidence || {}),
      finalQueryText,
      finalResponseExcerpt,
      JSON.stringify(input.metadata || {}),
    ]
  );

  return mapGovernance(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// GET MEMORY GRAPH
// ──────────────────────────────────────────────────────────────

export async function getMemoryGraph(memoryId, options = {}) {
  const { depth = 2, direction = 'both' } = options;

  // Get center node
  const center = await getMemory(memoryId, { includeArchived: true });
  if (!center) throw new NotFoundError(`Memory ${memoryId} not found`);

  // Get edges
  let edgeSql = '';
  const params = [memoryId, depth];

  if (direction === 'outgoing') {
    edgeSql = `SELECT * FROM memory_edges WHERE from_memory_id = $1`;
  } else if (direction === 'incoming') {
    edgeSql = `SELECT * FROM memory_edges WHERE to_memory_id = $1`;
  } else {
    edgeSql = `SELECT * FROM memory_edges WHERE from_memory_id = $1 OR to_memory_id = $1`;
  }

  const edges = await query(edgeSql, [memoryId]);

  // Get connected memory nodes
  const connectedIds = new Set();
  for (const edge of edges.rows) {
    connectedIds.add(edge.from_memory_id);
    connectedIds.add(edge.to_memory_id);
  }
  connectedIds.delete(memoryId);

  let nodes = [center];
  if (connectedIds.size > 0) {
    const idList = Array.from(connectedIds);
    const result = await query(
      `SELECT * FROM agent_memories WHERE id = ANY($1) ORDER BY created_at DESC`,
      [idList]
    );
    nodes = nodes.concat(result.rows.map(mapMemory));
  }

  return {
    nodes,
    edges: edges.rows.map(mapEdge),
  };
}

// ──────────────────────────────────────────────────────────────
// Mappers
// ──────────────────────────────────────────────────────────────

function mapAgent(row) {
  return {
    id:          row.id,
    name:        row.name,
    agentType:   row.agent_type,
    description: row.description,
    config:      row.config,
    isActive:    row.is_active,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

function mapMemory(row) {
  return {
    id:         row.id,
    agentId:    row.agent_id,
    agentName:  row.agent_name,
    memoryType: row.memory_type,
    title:      row.title,
    content:    row.content,
    source:     row.source,
    sourceFile: row.source_file,
    importance: row.importance,
    confidence: parseFloat(row.confidence),
    tags:       typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    metadata:   typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    isArchived: row.is_archived,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapEdge(row) {
  return {
    id:            row.id,
    fromMemoryId:  row.from_memory_id,
    toMemoryId:    row.to_memory_id,
    relationType:  row.relation_type,
    weight:        parseFloat(row.weight),
    metadata:      typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt:     row.created_at,
  };
}

function mapRetrieval(row) {
  return {
    id:                   row.id,
    queryText:            row.query_text,
    mode:                 row.mode,
    topK:                 row.top_k,
    retrievedMemoryIds:   row.retrieved_memory_ids,
    retrievedDocPaths:    row.retrieved_doc_paths,
    agentName:            row.agent_name,
    agentRunId:           row.agent_run_id,
    latencyMs:            row.latency_ms,
    cacheHit:             row.cache_hit,
    contextSizeChars:     row.context_size_chars,
    governanceViolations: row.governance_violations,
    queryRedacted:        row.query_redacted,
    redactionReason:      row.redaction_reason,
    originalQueryHash:    row.original_query_hash,
    createdAt:            row.created_at,
  };
}

function mapGovernance(row) {
  return {
    id:               row.id,
    agentName:        row.agent_name,
    agentRunId:       row.agent_run_id,
    ruleName:         row.rule_name,
    action:           row.action,
    decision:         row.decision,
    evidence:         typeof row.evidence === 'string' ? JSON.parse(row.evidence) : (row.evidence || {}),
    queryText:        row.query_text,
    responseExcerpt:  row.response_excerpt,
    metadata:         typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata || {}),
    createdAt:        row.created_at,
  };
}

// ──────────────────────────────────────────────────────────────
// Re-export error types for convenience
// ──────────────────────────────────────────────────────────────

export { SecurityError, ValidationError, NotFoundError, PermissionError };