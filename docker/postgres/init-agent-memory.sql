-- ================================================================
-- v1.3.0 Persistent Agent Memory — PostgreSQL Schema
-- Branch: platform/v1.3.0-persistent-memory
-- Phase: A — Design only, no implementation
-- Date: 2026-05-27
-- ================================================================
--
-- Prerequisites:
CREATE EXTENSION IF NOT EXISTS pgvector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- Connection: psql $POSTGRES_URL -f init-agent-memory.sql
-- ================================================================

-- ──────────────────────────────────────────────
-- agents
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(128) NOT NULL UNIQUE,
  description   TEXT,
  agent_type    VARCHAR(64) NOT NULL,
  soul_md_hash  VARCHAR(64),
  config        JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type);

COMMENT ON TABLE agents IS 'Registered agents that can create and retrieve memories.';
COMMENT ON COLUMN agents.soul_md_hash IS 'SHA-256 of SOUL.md at agent creation time for tamper detection.';
COMMENT ON COLUMN agents.agent_type IS 'release-manager|rag-memory|token-cost|runtime-triage|model-router|human|system';


-- ──────────────────────────────────────────────
-- agent_runs
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_key   VARCHAR(256) NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  model         VARCHAR(128),
  runtime_ms    INTEGER,
  exit_reason   VARCHAR(64),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runs_agent   ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_runs_session ON agent_runs(session_key);
CREATE INDEX IF NOT EXISTS idx_runs_started ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_ended   ON agent_runs(ended_at) WHERE ended_at IS NOT NULL;

COMMENT ON TABLE agent_runs IS 'Per-session agent run records for billing, auditing, and performance analysis.';
COMMENT ON COLUMN agent_runs.exit_reason IS 'completed|error|timeout|cancelled|heartbeat_timeout';


-- ──────────────────────────────────────────────
-- agent_memories
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
  agent_name    VARCHAR(128) NOT NULL,
  memory_type   VARCHAR(64) NOT NULL,
  title         VARCHAR(256) NOT NULL,
  content       TEXT NOT NULL,
  source        VARCHAR(64) NOT NULL,
  source_file   VARCHAR(512),
  importance    INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  confidence    NUMERIC(3,2) DEFAULT 1.00 CHECK (confidence BETWEEN 0 AND 1),
  tags          JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  is_archived   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_memories_agent        ON agent_memories(agent_name);
CREATE INDEX IF NOT EXISTS idx_memories_type          ON agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_memories_archived       ON agent_memories(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_memories_created       ON agent_memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_importance    ON agent_memories(importance DESC);
CREATE INDEX IF NOT EXISTS idx_memories_tags         ON agent_memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memories_source       ON agent_memories(source);

COMMENT ON TABLE agent_memories IS 'Core memory store for all agent-persisted knowledge.';
COMMENT ON COLUMN agent_memories.memory_type IS 'episodic|semantic|working|governance|procedural';
COMMENT ON COLUMN agent_memories.source IS 'agent|human|system|migration|runtime';
COMMENT ON COLUMN agent_memories.is_archived IS 'Soft-delete flag. Archived memories excluded from prompt context by default.';
COMMENT ON COLUMN agent_memories.confidence IS 'Agent confidence in memory accuracy. 0.00=guess, 1.00=verified.';


-- ──────────────────────────────────────────────
-- memory_embeddings (pgvector for agent memories)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id     UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  chunk_index   INTEGER DEFAULT 0,
  chunk_text    TEXT NOT NULL,
  embedding     VECTOR(768),
  chunk_hash    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, chunk_index)
);

-- IVFFlat index for approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_mem_embeddings_vector
  ON memory_embeddings USING ivfflat(embedding vector_cosine_ops)
  WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_mem_embeddings_memory ON memory_embeddings(memory_id);
CREATE INDEX IF NOT EXISTS idx_mem_embeddings_hash   ON memory_embeddings(chunk_hash);

COMMENT ON TABLE memory_embeddings IS 'Vector embeddings for agent memory content (separate from RAG doc embeddings).';
COMMENT ON COLUMN memory_embeddings.embedding IS '768-dim vector from Ollama nomic-embed-text.';
COMMENT ON COLUMN memory_embeddings.chunk_hash IS 'SHA-256 of chunk_text for deduplication.';


-- ──────────────────────────────────────────────
-- memory_edges  (runtime graph)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_edges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_memory_id  UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  to_memory_id    UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  relation_type   VARCHAR(64) NOT NULL,
  weight          NUMERIC(4,3) DEFAULT 1.000 CHECK (weight BETWEEN 0 AND 1),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_memory_id, to_memory_id, relation_type),
  CHECK (from_memory_id != to_memory_id)
);

CREATE INDEX IF NOT EXISTS idx_edges_from      ON memory_edges(from_memory_id);
CREATE INDEX IF NOT EXISTS idx_edges_to        ON memory_edges(to_memory_id);
CREATE INDEX IF NOT EXISTS idx_edges_type      ON memory_edges(relation_type);
CREATE INDEX IF NOT EXISTS idx_edges_weight    ON memory_edges(weight DESC);

COMMENT ON TABLE memory_edges IS 'Runtime graph edges connecting related memories.';
COMMENT ON COLUMN memory_edges.relation_type IS 'created|retrieved|depends_on|supersedes|contradicts|validates|blocks|refines|retrieved_by';


-- ──────────────────────────────────────────────
-- memory_events  (audit log for all memory lifecycle events)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id     UUID REFERENCES agent_memories(id) ON DELETE CASCADE,
  event_type    VARCHAR(64) NOT NULL,
  actor_agent   VARCHAR(128),
  actor_session VARCHAR(256),
  old_value     JSONB,
  new_value     JSONB,
  reason        TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_memory   ON memory_events(memory_id);
CREATE INDEX IF NOT EXISTS idx_events_type    ON memory_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_actor   ON memory_events(actor_agent);
CREATE INDEX IF NOT EXISTS idx_events_created ON memory_events(created_at DESC);

COMMENT ON TABLE memory_events IS 'Immutable audit log. Every memory write operation is recorded here.';
COMMENT ON COLUMN memory_events.event_type IS 'created|updated|archived|restored|deleted|linked|unlinked|retrieved';


-- ──────────────────────────────────────────────
-- retrieval_history
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retrieval_history (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text               TEXT NOT NULL,
  query_hash               VARCHAR(64) NOT NULL,
  mode                     VARCHAR(32) NOT NULL,
  top_k                    INTEGER DEFAULT 5,
  retrieved_memory_ids     UUID[],
  retrieved_doc_paths      TEXT[],
  agent_name               VARCHAR(128),
  agent_run_id             UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  latency_ms               INTEGER,
  cache_hit                BOOLEAN DEFAULT false,
  context_size_chars       INTEGER,
  governance_violations    INTEGER DEFAULT 0,
  query_redacted      BOOLEAN DEFAULT false,
  redaction_reason     TEXT,
  original_query_hash VARCHAR(64),
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rh_query_hash ON retrieval_history(query_hash);
CREATE INDEX IF NOT EXISTS idx_rh_agent     ON retrieval_history(agent_name);
CREATE INDEX IF NOT EXISTS idx_rh_mode      ON retrieval_history(mode);
CREATE INDEX IF NOT EXISTS idx_rh_created   ON retrieval_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rh_run       ON retrieval_history(agent_run_id) WHERE agent_run_id IS NOT NULL;

COMMENT ON TABLE retrieval_history IS 'Complete retrieval audit trail linking queries to results.';
COMMENT ON COLUMN retrieval_history.retrieved_memory_ids IS 'Persistent memory IDs from agent memory layer.';
COMMENT ON COLUMN retrieval_history.retrieved_doc_paths IS 'RAG doc paths from document retrieval (backward compat).';
COMMENT ON COLUMN retrieval_history.query_redacted IS 'True if query_text contained secrets and was redacted before storage.';
COMMENT ON COLUMN retrieval_history.original_query_hash IS 'SHA-256 of the original (non-redacted) query for audit. Actual query not stored if redacted.';


-- ──────────────────────────────────────────────
-- governance_audit_log
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS governance_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name        VARCHAR(128),
  agent_run_id      UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  rule_name         VARCHAR(256) NOT NULL,
  action            VARCHAR(64) NOT NULL,
  decision          VARCHAR(32) NOT NULL,
  evidence          JSONB DEFAULT '{}',
  query_text        TEXT,
  response_excerpt  TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gal_agent   ON governance_audit_log(agent_name);
CREATE INDEX IF NOT EXISTS idx_gal_rule    ON governance_audit_log(rule_name);
CREATE INDEX IF NOT EXISTS idx_gal_action  ON governance_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_gal_decision ON governance_audit_log(decision);
CREATE INDEX IF NOT EXISTS idx_gal_created  ON governance_audit_log(created_at DESC);

-- Governance audit log — permanent, insert-only
-- Phase B.0: Add enforcement trigger below after table creation

-- ================================================================
-- Trigger: prevent UPDATE/DELETE on governance_audit_log (insert-only)
-- ================================================================
CREATE OR REPLACE FUNCTION prevent_governance_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'governance_audit_log is insert-only: UPDATE and DELETE are prohibited';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_gal_modify ON governance_audit_log;
CREATE TRIGGER trg_prevent_gal_modify
  BEFORE UPDATE OR DELETE ON governance_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_governance_log_modification();

COMMENT ON FUNCTION prevent_governance_log_modification() IS 'Enforces insert-only policy on governance_audit_log. Called by trigger trg_prevent_gal_modify.';


-- ──────────────────────────────────────────────
-- Trigger: auto-update updated_at on agent_memories
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_memories_updated_at ON agent_memories;
CREATE TRIGGER trg_agent_memories_updated_at
  BEFORE UPDATE ON agent_memories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ──────────────────────────────────────────────
-- Trigger: auto-log memory_events on INSERT/UPDATE/DELETE
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_memory_event()
RETURNS TRIGGER AS $$
DECLARE
  evt VARCHAR(64);
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    evt := 'created';
    new_vals := to_jsonb(NEW)::JSONB;
    INSERT INTO memory_events(memory_id, event_type, actor_agent, new_value, metadata)
    VALUES (NEW.id, evt, NEW.agent_name, new_vals, '{}'::JSONB);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_archived = true AND OLD.is_archived = false THEN
      evt := 'archived';
    ELSIF NEW.is_archived = false AND OLD.is_archived = true THEN
      evt := 'restored';
    ELSE
      evt := 'updated';
    END IF;
    old_vals := to_jsonb(OLD)::JSONB;
    new_vals := to_jsonb(NEW)::JSONB;
    INSERT INTO memory_events(memory_id, event_type, actor_agent, old_value, new_value, metadata)
    VALUES (NEW.id, evt, NEW.agent_name, old_vals, new_vals, '{}'::JSONB);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    evt := 'deleted';
    old_vals := to_jsonb(OLD)::JSONB;
    INSERT INTO memory_events(memory_id, event_type, actor_agent, old_value, metadata)
    VALUES (OLD.id, evt, OLD.agent_name, old_vals, '{}'::JSONB);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memory_events_log ON agent_memories;
CREATE TRIGGER trg_memory_events_log
  AFTER INSERT OR UPDATE OR DELETE ON agent_memories
  FOR EACH ROW EXECUTE FUNCTION log_memory_event();


-- ──────────────────────────────────────────────
-- Row-Level Security (RLS) — commented until Phase B
-- ──────────────────────────────────────────────
-- NOTE: RLS will be enabled in Phase B implementation.
-- Uncomment after confirming PostgreSQL version supports RLS.
--
-- ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memory_edges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
--
-- -- Agents can read their own memories + shared types
-- CREATE POLICY memory_read_policy ON agent_memories
--   USING (
--     agent_name = current_setting('app.current_agent', true)
--     OR memory_type IN ('governance', 'semantic', 'procedural')
--   );
--
-- -- Agents can only write their own memories
-- CREATE POLICY memory_write_policy ON agent_memories
--   FOR INSERT WITH CHECK (
--     agent_name = current_setting('app.current_agent', true)
--   );


-- ================================================================
-- Seed: Register the QClaw agent (Phase B will upsert, this is Phase A stub)
-- ================================================================
INSERT INTO agents (id, name, agent_type, description)
VALUES ('00000000-0000-0000-0000-000000000001'::UUID, 'qclaw', 'system', 'Primary QClaw agent')
ON CONFLICT (name) DO NOTHING;