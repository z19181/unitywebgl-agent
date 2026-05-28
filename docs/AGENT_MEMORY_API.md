# Agent Memory API — v1.3.0
## Interface Definitions for Persistent Memory Layer

---

## Design Principles

1. **Secret-safe at write time**: Every write operation scans for secrets before persisting
2. **Soft-delete only**: No hard deletes; all deletions are archives logged to `memory_events`
3. **Audit-first**: Every operation writes to `memory_events` before returning
4. **Agent-scoped by default**: Memories belong to an agent; shared memories use `memory_type` filters
5. **Embedding on-demand**: Embeddings created async after memory write; not blocking

---

## Core API

### `createMemory(options)` → `Memory`

Creates a new agent memory. Secret-scanned before write. Fails if secrets detected.

```typescript
interface CreateMemoryOptions {
  agentId?:     UUID;           // internal agent ID (optional, derived from agentName if omitted)
  agentName:    string;         // required
  memoryType:   MemoryType;     // 'episodic' | 'semantic' | 'working' | 'governance' | 'procedural'
  title:        string;         // max 256 chars
  content:      string;        // max 1MB
  source:       MemorySource;   // 'agent' | 'human' | 'system' | 'migration' | 'runtime'
  sourceFile?:  string;         // original file path
  importance?:  number;         // 1-10, default 5
  confidence?:  number;         // 0.00-1.00, default 1.00
  tags?:        string[];
  metadata?:    object;
}

interface Memory {
  id:           UUID;
  agentId:      UUID;
  agentName:    string;
  memoryType:   MemoryType;
  title:        string;
  content:      string;
  source:       MemorySource;
  sourceFile?:  string;
  importance:   number;
  confidence:   number;
  tags:         string[];
  metadata:     object;
  isArchived:   boolean;
  createdAt:    Date;
  updatedAt:    Date;
  archivedAt?:  Date;
}
```

**Behavior:**
1. Scan `content`, `title`, `tags`, `metadata` for secrets via `detectSecrets()`
2. If secrets found → throw `SecurityError` with list of detected secrets
3. If `memoryType='governance'`:
   - Validate `source` is `'system'` or `'migration'`
   - Require elevated permission (Phase B: via governance_enforcer)
4. Insert into `agent_memories`
5. Emit `memory_events.event_type='created'`
6. Return `Memory` object with `id`

**Errors:**
- `SecurityError`: Content contains prohibited secrets
- `ValidationError`: Invalid memoryType, missing required fields
- `PermissionError`: Insufficient permission for governance memory

---

### `getMemory(memoryId, options?)` → `Memory | null`

Retrieves a single memory by ID. Scans for secrets at read time (defensive).

```typescript
interface GetMemoryOptions {
  includeArchived?: boolean;  // default false
}
```

**Behavior:**
1. Query `agent_memories WHERE id = memoryId`
2. If `is_archived=true` and `includeArchived=false` → return `null`
3. Scan `content` for secrets
4. If violations found → log warning, redact in response
5. Emit `memory_events.event_type='retrieved'`
6. Return `Memory` or `null`

---

### `getMemoriesByAgent(agentName, options?)` → `Memory[]`

Lists memories for a specific agent with filtering.

```typescript
interface GetMemoriesOptions {
  memoryTypes?:    MemoryType[];
  includeArchived?: boolean;
  tags?:           string[];       // memories must have ALL these tags
  minImportance?:  number;
  since?:          Date;           // created_at >= since
  limit?:          number;        // default 50, max 200
  offset?:         number;
  orderBy?:        'created_at' | 'importance' | 'updated_at';
  orderDir?:       'ASC' | 'DESC';
}
```

**Behavior:**
1. Build query with filters
2. Emit `memory_events.event_type='retrieved'` (batch, not per-row)
3. Return `Memory[]`

---

### `searchMemory(query, options?)` → `MemorySearchResult[]`

Semantic + keyword search across agent memories. Uses pgvector + keyword index.

```typescript
interface SearchMemoryOptions {
  agentName?:     string;          // filter by agent
  memoryTypes?:  MemoryType[];
  includeArchived?: boolean;
  limit?:         number;          // default 10, max 50
  mode?:          'semantic' | 'keyword' | 'hybrid';
  minSimilarity?: number;          // 0-1, default 0.3
}

interface MemorySearchResult {
  memory:       Memory;
  similarity:   number;           // 0-1
  matchedTerms: string[];         // keyword matches
  reason:       string;          // human-readable reason
}
```

**Behavior:**
1. If mode='semantic' → `memory_embeddings` ANN search (pgvector)
2. If mode='keyword' → `to_tsvector` full-text search on `agent_memories.title || content`
3. If mode='hybrid' → combine both, weighted average
4. Filter by `memoryTypes`, `agentName`, `is_archived`
5. Apply `minSimilarity` threshold
6. Emit `memory_events.event_type='retrieved'` (batch)
7. Emit `retrieval_history` entry
8. Return `MemorySearchResult[]` sorted by `similarity DESC`

---

### `updateMemory(memoryId, updates, actor?)` → `Memory`

Updates a memory's content, metadata, or importance. Archives old version in `memory_events`.

```typescript
interface UpdateMemoryOptions {
  content?:     string;
  title?:       string;           // max 256 chars
  importance?:  number;           // 1-10
  tags?:        string[];
  metadata?:    object;           // merged, not replaced
  actor?:       string;           // agent/session doing the update
  reason?:      string;           // audit note
}
```

**Behavior:**
1. Fetch existing memory
2. If `is_archived=true` → throw `ValidationError('Cannot update archived memory')`
3. If updating `content` → scan for secrets
4. Update fields, set `updated_at = NOW()`
5. Emit `memory_events.event_type='updated'` with `old_value` and `new_value`
6. Return updated `Memory`

**Errors:**
- `SecurityError`: New content contains secrets
- `ValidationError`: Memory is archived, or invalid fields
- `NotFoundError`: Memory does not exist

---

### `archiveMemory(memoryId, options?)` → `Memory`

Soft-deletes a memory. Sets `is_archived=true`, records reason in `memory_events`.

```typescript
interface ArchiveMemoryOptions {
  reason:     string;             // required — audit trail
  actor?:     string;            // agent/session doing the archive
}
```

**Behavior:**
1. Fetch existing memory
2. If `is_archived=true` → return (idempotent)
3. If `memoryType='governance'` → throw `PermissionError('Governance memories cannot be archived')`
4. Set `is_archived=true`, `archived_at=NOW()`
5. Emit `memory_events.event_type='archived'` with `reason`
6. Return archived `Memory`

**Errors:**
- `PermissionError`: Governance memories cannot be archived
- `ValidationError`: Missing reason

---

### `linkMemories(fromMemoryId, toMemoryId, relationType, options?)` → `MemoryEdge`

Creates a directed edge between two memories in the runtime graph.

```typescript
interface LinkMemoriesOptions {
  fromMemoryId:  UUID;
  toMemoryId:    UUID;
  relationType:  RelationType;   // 'created'|'retrieved'|'depends_on'|'supersedes'|'contradicts'|'validates'|'blocks'|'refines'|'retrieved_by'
  weight?:       number;         // 0-1, default 1.0
  metadata?:     object;
  actor?:        string;
}
```

**Behavior:**
1. Validate both memories exist
2. Validate `relationType` is allowed
3. If edge already exists → upsert (update weight/metadata)
4. Emit `memory_events.event_type='linked'` on `fromMemoryId`
5. Return `MemoryEdge`

**Errors:**
- `ValidationError`: Memory IDs identical, or invalid relationType
- `NotFoundError`: One or both memories don't exist

---

### `unlinkMemories(fromMemoryId, toMemoryId, relationType)` → `boolean`

Removes a directed edge from the runtime graph.

```typescript
// Returns true if edge was deleted, false if it didn't exist
```

---

### `getMemoryGraph(memoryId, options?)` → `MemoryGraph`

Returns the subgraph centered on a memory.

```typescript
interface GetMemoryGraphOptions {
  memoryId:       UUID;
  depth?:         number;          // default 2, max 5
  relationTypes?: RelationType[];
  direction?:     'outgoing' | 'incoming' | 'both';
}

interface MemoryGraph {
  nodes:  Memory[];
  edges:  MemoryEdge[];
}
```

---

### `recordRetrieval(params)` → `RetrievalRecord`

Records a retrieval event for audit and analytics.

```typescript
interface RecordRetrievalParams {
  queryText:          string;
  queryHash:          string;
  mode:               'keyword' | 'semantic' | 'hybrid' | 'governance';
  topK:               number;
  retrievedMemoryIds: UUID[];         // from persistent memory layer
  retrievedDocPaths:  string[];       // from RAG document layer
  agentName:          string;
  agentRunId?:        UUID;
  latencyMs:          number;
  cacheHit:           boolean;
  contextSizeChars:   number;
  governanceViolations: number;
}
```

**Behavior:**
1. Insert into `retrieval_history`
2. Return record with `id`

---

### `recordGovernanceDecision(params)` → `GovernanceAuditRecord`

Records a governance enforcement decision.

```typescript
interface RecordGovernanceParams {
  agentName:       string;
  agentRunId?:     UUID;
  ruleName:        string;
  action:          'enforced' | 'bypassed' | 'queried' | 'violated';
  decision:        'allow' | 'block' | 'warn' | 'escalate';
  evidence:        object;
  queryText?:      string;
  responseExcerpt?: string;
  metadata?:       object;
}
```

**Behavior:**
1. Insert into `governance_audit_log`
2. Return record with `id`
3. Note: `governance_audit_log` is permanent — no archive/delete operation

---

## Supporting Functions

### `detectSecrets(content)` → `Secret[]`
Scans text for API keys, tokens, passwords, private keys. Returns list of detected secrets with positions.

### `redactSecrets(content)` → `string`
Replaces detected secrets with `[REDACTED:TYPE]` markers.

### `getRetentionPolicy(memoryType)` → `RetentionPolicy`
Returns `{ activeDays, archiveAfterDays, permanent }` for given memory type.

### `archiveExpiredMemories()` → `number`
Nightly job: soft-archives memories past retention policy. Returns count archived.

### `migrateMemoryFiles(options)` → `MigrationResult`
One-way migration from `memory/YYYY-MM-DD.md` and `MEMORY.md` to persistent store.

### `registerAgent(name, agentType, config)` → `Agent`
Creates or upserts agent record in `agents` table.

---

## Error Types

```typescript
class SecurityError    extends Error {}  // secrets detected
class ValidationError  extends Error {}  // invalid input
class PermissionError extends Error {}  // access denied
class NotFoundError   extends Error {}  // resource not found
class DuplicateError  extends Error {}  // unique constraint violation
```

---

*Document: AGENT_MEMORY_API.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: A — Design only, no implementation*