// Agent runs — session-bound run lifecycle
// Part of v1.3.0 Phase B.0

import { query } from './db.js';
import { getOrCreateAgent } from './memory_store.js';

// ──────────────────────────────────────────────────────────────
// startRun(agentName, metadata?) → AgentRun
// Creates a new agent run record; returns run object
// ──────────────────────────────────────────────────────────────

export async function startRun(agentName, metadata = {}) {
  // Resolve agent (creates if doesn't exist)
  const agent = await getOrCreateAgent(agentName, { agentType: 'system' });
  
  const sessionKey = metadata.sessionKey || generateSessionKey();
  const model = metadata.model || null;
  
  const result = await query(
    `INSERT INTO agent_runs (agent_id, session_key, model, started_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, agent_id, session_key, started_at, ended_at, model, runtime_ms, exit_reason`,
    [agent.id, sessionKey, model]
  );
  
  return mapRun(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// endRun(runId, exitReason?, summary?) → AgentRun
// Closes an agent run with exit reason and optional summary stored in metadata
// ──────────────────────────────────────────────────────────────

export async function endRun(runId, exitReason = 'completed', summary = null) {
  const result = await query(
    `UPDATE agent_runs
     SET ended_at = NOW(),
         runtime_ms = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER * 1000,
         exit_reason = $2
     WHERE id = $1
     RETURNING id, agent_id, session_key, started_at, ended_at, model, runtime_ms, exit_reason`,
    [runId, exitReason]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Agent run ${runId} not found`);
  }
  
  return mapRun(result.rows[0]);
}

// ──────────────────────────────────────────────────────────────
// getRun(runId) → AgentRun | null
// ──────────────────────────────────────────────────────────────

export async function getRun(runId) {
  const result = await query(
    `SELECT id, agent_id, session_key, started_at, ended_at, model, runtime_ms, exit_reason
     FROM agent_runs WHERE id = $1`,
    [runId]
  );
  return result.rows.length > 0 ? mapRun(result.rows[0]) : null;
}

// ──────────────────────────────────────────────────────────────
// getActiveRun(agentName) → AgentRun | null
// Returns the most recent un-ended run for an agent
// ──────────────────────────────────────────────────────────────

export async function getActiveRun(agentName) {
  const result = await query(
    `SELECT r.id, r.agent_id, r.session_key, r.started_at, r.ended_at, r.model, r.runtime_ms, r.exit_reason
     FROM agent_runs r
     JOIN agents a ON a.id = r.agent_id
     WHERE a.name = $1 AND r.ended_at IS NULL
     ORDER BY r.started_at DESC
     LIMIT 1`,
    [agentName]
  );
  return result.rows.length > 0 ? mapRun(result.rows[0]) : null;
}

// ──────────────────────────────────────────────────────────────
// getRecentRuns(agentName, limit?) → AgentRun[]
// ──────────────────────────────────────────────────────────────

export async function getRecentRuns(agentName, limit = 10) {
  const result = await query(
    `SELECT r.id, r.agent_id, r.session_key, r.started_at, r.ended_at, r.model, r.runtime_ms, r.exit_reason
     FROM agent_runs r
     JOIN agents a ON a.id = r.agent_id
     WHERE a.name = $1
     ORDER BY r.started_at DESC
     LIMIT $2`,
    [agentName, limit]
  );
  return result.rows.map(mapRun);
}

// ──────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────

function mapRun(row) {
  return {
    id:         row.id,
    agentId:    row.agent_id,
    sessionKey: row.session_key,
    startedAt:  row.started_at,
    endedAt:    row.ended_at,
    model:      row.model,
    runtimeMs:  row.runtime_ms,
    exitReason: row.exit_reason,
  };
}

function generateSessionKey() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}