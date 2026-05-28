# v1.3.0 Persistent Agent Memory — Design Document
# Phase A: Architecture & Schema Design

---

## 1. Current v1.2.0 Runtime Capability Summary

### 1.1 Retrieval Pipeline
- `retrieveContext(query, options)` — unified runtime API
- Modes: `keyword`, `semantic`, `hybrid`
- Governance enforcement via `enforceGovernanceResults()`
- `context_guard.js` — secret detection and redaction
- `buildPromptContext()` — LLM-safe context generation
- `retrieval_cache.js` — query-level LRU cache

### 1.2 Agent Adapters (5)
- `release_manager_adapter` — release gate, governance, version history
- `rag_memory_adapter` — config, embedding, governance-aware
- `token_cost_adapter` — cost estimation, model pricing, optimization
- `runtime_triage_adapter` — diagnosis, error patterns, constraints
- `model_router_adapter` — routing, model comparison, fallback

### 1.3 Governance Framework
- `governance_enforcer.js` — named exports: `enforceGovernanceResults`, `hasGovernanceIntent`, `isGovernanceResult`
- HARD_CONSTRAINT_FILES / GOVERNANCE_FILES arrays
- GOVERNANCE_RESULT_TERMS detection
- Violations tracked per retrieval
- Safety guard blocking patterns (MUST_NOT_SUGGEST_PATTERNS)

### 1.4 Metrics (v1.2.0)
- HYBRID Recall@5: 0.5250
- MRR: 0.4804, NDCG@5: 0.4466
- Governance Violations: 0
- 88/88 runtime tests PASS

### 1.5 What's Missing (Gap Analysis)
| Capability | v1.2.0 | v1.3.0 Target |
|---|---|---|
| Memory writes from agent | ❌ | ✅ |
| Cross-session memory continuity | ❌ | ✅ |
| Memory graph (relationships) | ❌ | ✅ |
| Auditable memory lifecycle | ❌ | ✅ |
| Archived memory isolation | ❌ | ✅ |
| Memory provenance / source tracking | ❌ | ✅ |
| Runtime decision traceability | ❌ | ✅ |
| PostgreSQL persistence | ❌ | ✅ |
| pgvector for memory search | ❌ | ✅ |

---

## 2. Why Persistent Memory?

### 2.1 The File-Based Memory Problem
Current memory lives in flat files:
- `memory/YYYY-MM-DD.md` — daily raw logs
- `MEMORY.md` — curated long-term memory
- `AGENTS.md`, `USER.md`, `SOUL.md`, `TOOLS.md`, `HEARTBEAT.md`

**Limitations:**
1. **No versioning** — overwrite loses history
2. **No cross-agent sharing** — one agent owns one file
3. **No structured search** — grep is the only query
4. **No relationships** — can't express "A depends on B"
5. **No provenance** — no record of why a memory was created
6. **No lifecycle management** — no archive, no expiration
7. **No access control** — no concept of agent vs. group memory
8. **Brittle continuity** — agent wakes fresh each session

### 2.2 What Persistent Memory Enables
- **Continuity**: Agent knows what happened in prior sessions without re-discover
- **Accountability**: Every decision traces to a memory with source + confidence
- **Graph reasoning**: "Why did agent X block task Y?" → follow edges
- **Selective forgetting**: Archive, don't delete — audit trail preserved
- **Multi-agent memory**: Agents share / inherit memory across sessions
- **Runtime introspection**: Agent queries own memory at runtime
- **Governance enforcement**: Hard constraints live in governance memory layer

---

## 3. File-Based Memory Limitations (Detailed)

### 3.1 Write Conflicts
When multiple agents write to the same `.md` file, last-write-wins with no merge strategy.

### 3.2 No Atomicity
Appending to `memory/YYYY-MM-DD.md` is not atomic. A crashed write corrupts the file.

### 3.3 No Transaction Support
Cannot roll back a bad memory write.

### 3.4 Limited Query
- Keyword search only (no semantic search across memory content)
- No filtering by agent, date range, memory_type, importance
- No aggregation queries (e.g., "count memories by agent this week")

### 3.5 No Soft Delete
`rm` is final. No archive, no audit.

### 3.6 No Schema Enforcement
`memory/YYYY-MM-DD.md` has no enforced structure. Every entry looks different.

### 3.7 No Access Control
All agents can read/write all memory files. No concept of private vs. shared.

---

## 4. PostgreSQL Schema Design

### 4.1 Architecture
- **Primary store**: PostgreSQL (structured data + full-text search)
- **Vector store**: pgvector extension (semantic memory search)
- **Migrations**: SQL-first, versioned in `docker/postgres/migrations/`
- **Connection**: pg Pool managed by `vector_store.js` (already existing, will be extended)
- **Backward compat**: RAG retrieval remains unchanged; persistent memory is a separate layer

### 4.2 Schema: agents

```sql
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(128) NOT NULL UNIQUE,
  description   TEXT,
  agent_type    VARCHAR(64) NOT NULL,           -- 'release-manager', 'rag-memory', etc.
  soul_md_hash  VARCHAR(64),                    -- SHA of SOUL.md at creation
  config        JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agents_name ON agents(name);
CREATE INDEX idx_agents_type ON agents(agent_type);
```

### 4.3 Schema: agent_runs

```sql
CREATE TABLE agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  session_key   VARCHAR(256) NOT NULL,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  model         VARCHAR(128),
  runtime_ms    INTEGER,
  exit_reason   VARCHAR(64),                     -- 'completed', 'error', 'timeout', 'cancelled'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_runs_session ON agent_runs(session_key);
CREATE INDEX idx_runs_started ON agent_runs(started_at);
```

### 4.4 Schema: agent_memories

```sql
CREATE TABLE agent_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  agent_name    VARCHAR(128) NOT NULL,
  memory_type   VARCHAR(64) NOT NULL,           -- 'episodic', 'semantic', 'working', 'governance', 'procedural'
  title         VARCHAR(256) NOT NULL,
  content       TEXT NOT NULL,
  source        VARCHAR(64) NOT NULL,            -- 'agent', 'human', 'system', 'migration', 'runtime'
  source_file   VARCHAR(512),                   -- original file path if migrated
  importance    INTEGER DEFAULT 5,               -- 1-10 scale
  confidence    NUMERIC(3,2) DEFAULT 1.00,      -- 0.00-1.00
  tags          JSONB DEFAULT '[]',
  metadata      JSONB DEFAULT '{}',
  is_archived   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  archived_at   TIMESTAMPTZ
);
CREATE INDEX idx_memories_agent ON agent_memories(agent_name);
CREATE INDEX idx_memories_type ON agent_memories(memory_type);
CREATE INDEX idx_memories_archived ON agent_memories(is_archived);
CREATE INDEX idx_memories_created ON agent_memories(created_at DESC);
CREATE INDEX idx_memories_tags ON agent_memories USING GIN(tags);
CREATE INDEX idx_memories_importance ON agent_memories(importance DESC);
```

**memory_type values:**
- `episodic`: Things that happened (session logs, decisions made)
- `semantic`: Facts and knowledge (learned truths)
- `working`: Current task state (scratch memory, active todos)
- `governance`: Hard constraints, rules, policies
- `procedural`: How-to knowledge (workflows, processes)

### 4.5 Schema: memory_embeddings

```sql
CREATE TABLE memory_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id     UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  chunk_index   INTEGER DEFAULT 0,
  chunk_text    TEXT NOT NULL,
  embedding     VECTOR(768),                    -- nomic-embed-text dimension
  chunk_hash    VARCHAR(64) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, chunk_index)
);
CREATE INDEX idx_mem_embeddings_vector ON memory_embeddings USING ivfflat(embedding vector_cosine_ops);
CREATE INDEX idx_mem_embeddings_memory ON memory_embeddings(memory_id);
```

### 4.6 Schema: memory_edges

```sql
CREATE TABLE memory_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_memory_id UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  to_memory_id   UUID NOT NULL REFERENCES agent_memories(id) ON DELETE CASCADE,
  relation_type VARCHAR(64) NOT NULL,           -- 'created', 'retrieved', 'depends_on', 'supersedes', 'contradicts', 'validates', 'blocks', 'refines', 'retrieved_by'
  weight        NUMERIC(4,3) DEFAULT 1.000,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_memory_id, to_memory_id, relation_type)
);
CREATE INDEX idx_edges_from ON memory_edges(from_memory_id);
CREATE INDEX idx_edges_to ON memory_edges(to_memory_id);
CREATE INDEX idx_edges_type ON memory_edges(relation_type);
CREATE INDEX idx_edges_weight ON memory_edges(weight DESC);
```

### 4.7 Schema: memory_events

```sql
CREATE TABLE memory_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id     UUID REFERENCES agent_memories(id) ON DELETE CASCADE,
  event_type    VARCHAR(64) NOT NULL,           -- 'created', 'updated', 'archived', 'deleted', 'retrieved', 'linked', 'unlinked'
  actor_agent   VARCHAR(128),
  actor_session VARCHAR(256),
  old_value     JSONB,
  new_value     JSONB,
  reason        TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_memory ON memory_events(memory_id);
CREATE INDEX idx_events_type ON memory_events(event_type);
CREATE INDEX idx_events_actor ON memory_events(actor_agent);
CREATE INDEX idx_events_created ON memory_events(created_at DESC);
```

### 4.8 Schema: retrieval_history

```sql
CREATE TABLE retrieval_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text         TEXT NOT NULL,
  query_hash         VARCHAR(64) NOT NULL,
  mode               VARCHAR(32) NOT NULL,      -- 'keyword', 'semantic', 'hybrid', 'governance'
  top_k              INTEGER DEFAULT 5,
  retrieved_memory_ids UUID[],                  -- agent_memories IDs (persistent layer)
  retrieved_doc_paths TEXT[],                   -- RAG doc paths (for backward compat)
  agent_name         VARCHAR(128),
  agent_run_id       UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  latency_ms         INTEGER,
  cache_hit          BOOLEAN DEFAULT false,
  context_size_chars INTEGER,
  governance_violations INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rh_query_hash ON retrieval_history(query_hash);
CREATE INDEX idx_rh_agent ON retrieval_history(agent_name);
CREATE INDEX idx_rh_mode ON retrieval_history(mode);
CREATE INDEX idx_rh_created ON retrieval_history(created_at DESC);
```

### 4.9 Schema: governance_audit_log

```sql
CREATE TABLE governance_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name      VARCHAR(128),
  agent_run_id    UUID REFERENCES agent_runs(id) ON DELETE SET NULL,
  rule_name       VARCHAR(256) NOT NULL,
  action          VARCHAR(64) NOT NULL,        -- 'enforced', 'bypassed', 'queried', 'violated'
  decision        VARCHAR(32) NOT NULL,        -- 'allow', 'block', 'warn', 'escalate'
  evidence        JSONB DEFAULT '{}',           -- query text, matched terms, scores
  query_text      TEXT,
  response_excerpt TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gal_agent ON governance_audit_log(agent_name);
CREATE INDEX idx_gal_rule ON governance_audit_log(rule_name);
CREATE INDEX idx_gal_action ON governance_audit_log(action);
CREATE INDEX idx_gal_created ON governance_audit_log(created_at DESC);
```

---

## 5. pgvector Role in v1.3.0

### 5.1 Two Vector Stores
v1.3.0 has two separate vector use cases:

**1. RAG Document Embeddings** (existing, unchanged)
- `memory_embeddings` table in `agents/rag-memory/` — for LLM context retrieval
- Embeds source documents (code, docs, configs)
- Managed by `ingest_vectors.js` / `build_index.cjs`

**2. Agent Memory Embeddings** (new, v1.3.0)
- `memory_embeddings` table above — for agent memory search
- Embeds agent-written memories
- Separate from RAG document retrieval
- Allows semantic search across agent experiences

### 5.2 Why Not Merge?
- Different update frequencies (docs: rare, memories: frequent)
- Different access patterns (LLM context vs. agent introspection)
- Different retention policies (docs: permanent, memories: archival)
- Separate namespaces via `source` column

### 5.3 Embedding Provider
- Use Ollama `nomic-embed-text` (768 dims) — same as v1.2.0
- No OpenAI API calls
- Embedder interface reused from `embedder.js`

---

## 6. Agent Memory Lifecycle

```
                    ┌──────────────────────────────────────┐
                    │           Memory Lifecycle            │
                    └──────────────────────────────────────┘

  ┌─────────┐    createMemory()    ┌──────────────┐    archiveMemory()    ┌──────────┐
  │  DRAFT  │ ──────────────────▶  │    ACTIVE    │ ───────────────────▶  │ ARCHIVED │
  └─────────┘                     └──────────────┘                        └──────────┘
       │                                 │
       │                                 ▼
       │                          updateMemory()
       │                                 │
       ▼                                 ▼
  ┌────────────────────────────────────────────────┐
  │              Linked via memory_edges            │
  │  depends_on / supersedes / contradicts / etc.   │
  └────────────────────────────────────────────────┘
       │
       ▼
  ┌──────────┐
  │ DELETED  │ ← soft delete only; record stays in memory_events
  └──────────┘
```

### 6.1 State Machine
- `DRAFT` → `ACTIVE`: memory is created and visible
- `ACTIVE` → `ARCHIVED`: agent/archiveMemory() called; memory excluded from prompt context by default
- `ACTIVE` → `DELETED`: soft delete; record preserved in memory_events for audit
- `ARCHIVED` can be reactivated (updateMemory with is_archived=false)

### 6.2 Memory Types
| Type | Description | Retention | Access |
|---|---|---|---|
| episodic | Session events, decisions | 90 days | Agent only |
| semantic | Facts, knowledge | Permanent | Shared |
| working | Current task state | Session | Agent only |
| governance | Hard constraints | Permanent | Shared + enforced |
| procedural | How-to knowledge | Permanent | Shared |

---

## 7. Memory Write / Read / Update / Archive

### 7.1 Write
```js
// Agent creates a memory
await createMemory({
  agentName: 'release-manager',
  memoryType: 'episodic',
  title: 'v0.2.0 release gate blocked',
  content: 'Blocked by incomplete CI pipeline. Check GitHub Actions.',
  source: 'agent',
  importance: 8,
  confidence: 0.95,
  tags: ['release', 'gate', 'ci'],
  metadata: { commit: 'abc123', blockedBy: 'missing-env-vars' }
});
```

### 7.2 Read
```js
// Get a specific memory
const memory = await getMemory(memoryId);

// List memories by agent
const memories = await getMemoriesByAgent('release-manager', {
  memoryType: 'episodic',
  limit: 20,
  includeArchived: false
});
```

### 7.3 Update
```js
await updateMemory(memoryId, {
  importance: 9,
  content: 'Updated: CI pipeline now fixed in commit def456',
  metadata: { resolvedBy: 'def456' }
});
```

### 7.4 Archive
```js
await archiveMemory(memoryId, {
  reason: 'Task completed; memory no longer relevant'
});
```

### 7.5 Search (Persistent Layer)
```js
// Semantic search across agent memories
const results = await searchMemory('CI pipeline release gate', {
  agentName: 'release-manager',
  memoryTypes: ['episodic', 'semantic'],
  limit: 10,
  includeArchived: false
});
```

---

## 8. Governance Memory vs. Normal Memory

### 8.1 Key Differences

| Property | Normal Memory | Governance Memory |
|---|---|---|
| memory_type | episodic/semantic/working/procedural | governance |
| source | agent / human | system / migration |
| importance | 1-10 (configurable) | Always 10 |
| archived_by | Any agent | Governance enforcer only |
| in_prompt_context | By importance score | Always included (unless archived) |
| deletable | Yes (soft) | No (permanent) |
| searchable via RAG | No | Yes (high priority) |
| requires_approval | No | Yes (governance_enforcer) |

### 8.2 Governance Memory Examples
- "Five Iron Laws" — hard constraints
- "Material Policy" — Unity WebGL constraints
- "Release Gate Process" — approval workflow
- "No tag creation rule" — hard constraint
- "server.js immutability" — hard constraint

### 8.3 How Governance Memory is Protected
1. **Source validation**: Only `source='system'` or `source='migration'` can create governance memories
2. **Type enforcement**: `memory_type='governance'` requires elevated permission
3. **Prompt inclusion**: Always in topK regardless of importance score
4. **Deletion prevention**: Hard delete blocked; only archive with reason
5. **Audit trail**: Every governance memory access logged to `governance_audit_log`

---

## 9. Memory Retention Policy

### 9.1 By Memory Type
| Memory Type | Active Retention | Archive After | Permanent Archive |
|---|---|---|---|
| episodic | 30 days | 90 days | No |
| semantic | Indefinite | Manual | No |
| working | Session only | N/A (auto-purge) | N/A |
| governance | Indefinite | Never | Never |
| procedural | Indefinite | Manual | No |

### 9.2 By Importance
- Importance 9-10: Extended retention (3x normal)
- Importance 1-3: Short retention (auto-archive after 7 days)

### 9.3 Retention Job
- Nightly cron job: `archiveExpiredMemories()`
- Checks `created_at` against retention policy per type
- Soft-archives (sets `is_archived=true`, records in `memory_events`)

---

## 10. Memory Deletion Policy

### 10.1 No Hard Delete
- **Never delete memory rows** — preserve audit trail
- Use soft delete: `archiveMemory()` sets `is_archived=true`
- `memory_events` records the deletion event with `event_type='deleted'`

### 10.2 Deletion Authorization
| Agent | Can Archive Own | Can Archive Others' | Can Delete |
|---|---|---|---|
| release-manager | Yes | No | No |
| rag-memory | Yes | No | No |
| governance | Yes | Yes (governance only) | No |
| human | Yes | Yes | No |
| system | Yes | Yes | Yes |

### 10.3 Deletion Audit
Every deletion (archive) must include:
- `reason`: Why it was archived
- `actor_agent`: Who did it
- `actor_session`: Which session
- `event_type='archived'` in `memory_events`

---

## 11. Security Model

### 11.1 Secret Prevention at Write Time
Before `createMemory()` or `updateMemory()`:
```js
const secrets = detectSecrets(content);
if (secrets.length > 0) {
  throw new SecurityError('Memory content contains secrets: ' + secrets.join(', '));
}
```
- Check against `SECRET_PATTERNS` (same as `context_guard.js`)
- Also scan `title`, `tags`, `metadata`
- Reject before write, never after

### 11.2 Secrets That Must Never Be Stored
- API keys (`sk-`, `skl-`, `sk-...`)
- Tokens (`OPENAI_API_KEY`, `GITHUB_TOKEN`, etc.)
- Passwords and credentials
- `.env` file contents
- Private keys (SSH, JWT, etc.)
- Bearer tokens
- Database connection strings with passwords

### 11.3 Secret Scanning at Read Time
Even with write-time prevention, scan at read time:
```js
function getMemory(memoryId) {
  const memory = db.query('SELECT * FROM agent_memories WHERE id = $1', [memoryId]);
  const violations = detectSecrets(memory.content);
  if (violations.length > 0) {
    logSecurityWarning(memoryId, violations);
    // Redact in response, don't block read
    memory.content = redactSecrets(memory.content);
  }
  return memory;
}
```

### 11.4 Access Control
- **Agent-scoped memories**: Agent can only read/write own memories + shared (governance, semantic)
- **Shared memories**: `memory_type IN ('governance', 'semantic', 'procedural')` are shared
- **Audit log**: All reads/writes logged to `memory_events`

### 11.5 Prompt Context Exclusion
- Archived memories excluded from `buildPromptContext()` by default
- Override with `includeArchived: true` (requires governance agent)

---

## 12. Audit Trail

### 12.1 What Gets Audited
| Event | Table | When |
|---|---|---|
| Memory created | memory_events | createMemory() |
| Memory updated | memory_events | updateMemory() |
| Memory archived | memory_events | archiveMemory() |
| Memory deleted | memory_events | archiveMemory() (soft) |
| Memories linked | memory_events | linkMemories() |
| Retrieval performed | retrieval_history | every retrieveContext() |
| Governance decision | governance_audit_log | enforceGovernanceResults() |
| Agent run started | agent_runs | session start |
| Agent run ended | agent_runs | session end |

### 12.2 Audit Log Retention
- `memory_events`: 2 years
- `retrieval_history`: 90 days
- `governance_audit_log`: Permanent (governance accountability)

---

## 13. Migration from .qclaw_handoff / memory/*.md

### 13.1 Migration Sources
1. `memory/YYYY-MM-DD.md` → `episodic` memories
2. `MEMORY.md` → `semantic` memories
3. `AGENTS.md`, `USER.md`, `SOUL.md` → `procedural` memories
4. `TOOLS.md` → `procedural` memories
5. `HEARTBEAT.md` → `working` memories (active items only)

### 13.2 Migration Process
```js
async function migrateMemoryFiles() {
  const agent = await getOrCreateAgent('qclaw', 'qclaw-agent');
  
  // Migrate MEMORY.md → semantic
  const memContent = readFile('MEMORY.md');
  const memories = parseMemoryMd(memContent);
  for (const m of memories) {
    await createMemory({
      agentId: agent.id,
      agentName: 'qclaw',
      memoryType: 'semantic',
      title: m.title,
      content: m.content,
      source: 'migration',
      source_file: 'MEMORY.md',
      importance: m.importance || 5,
      confidence: 0.8,
      tags: m.tags || [],
      metadata: { migrated: true, originalDate: m.date }
    });
  }
  // ... similar for other files
}
```

### 13.3 Migration Safety
- Run as one-way migration, not sync
- Preserve source_file reference for provenance
- Set confidence=0.8 (lower than direct agent memories)
- After migration, old files remain (no deletion)
- Flag in metadata: `migrated: true`

### 13.4 What NOT to Migrate
- `.env` files
- API key references
- Temporary scratch notes
- HEARTBEAT silent-reply entries
- Anything flagged as private

---

## 14. v1.3.0 Phase A Deliverables Summary

| Deliverable | Status |
|---|---|
| New branch platform/v1.3.0-persistent-memory | ✅ Created |
| docs/V1_3_0_PERSISTENT_AGENT_MEMORY_DESIGN.md | ✅ This file |
| docker/postgres/init-agent-memory.sql | ✅ Separate file |
| docs/AGENT_MEMORY_API.md | ✅ Separate file |
| docs/RUNTIME_GRAPH_DESIGN.md | ✅ Separate file |
| docs/PERSISTENT_MEMORY_SECURITY_CONSTRAINTS.md | ✅ Separate file |
| No implementation code | ✅ Constraint followed |

---

## 15. Open Questions (for Human Review)

1. **Workspace isolation**: Should each agent have a separate PostgreSQL schema, or share one schema with agent-scoped row-level security?
2. **Memory merge conflicts**: When two agents write to the same semantic memory, what's the merge strategy? Last-write-wins? Agent priority? Human review?
3. **Human memory**: Can humans write memories directly, or only via agent proxy?
4. **Memory expiration**: Should there be a TTL per memory_type, or only archive policies?
5. **Cross-agent retrieval**: Should agents be able to retrieve each other's working memories? (Probably not — privacy)
6. **Embedding cost**: Memories are written frequently. Should every write trigger an embedding? Or batch embeddings nightly?
7. **Migration ordering**: Should migration happen before Phase B implementation, or as part of Phase B?

---

*Document: V1_3_0_PERSISTENT_AGENT_MEMORY_DESIGN.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: A — Design only, no implementation*
*Author: QClaw Agent*
*Date: 2026-05-27*