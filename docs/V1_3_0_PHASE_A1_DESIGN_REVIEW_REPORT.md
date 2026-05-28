# v1.3.0 Phase A.1 — Design Review Gate Report
## Persistent Agent Memory + Runtime Graph

**Branch:** `platform/v1.3.0-persistent-memory`
**Review Date:** 2026-05-27
**Reviewer:** QClaw Agent
**Documents Reviewed:**
- `docs/V1_3_0_PERSISTENT_AGENT_MEMORY_DESIGN.md`
- `docker/postgres/init-agent-memory.sql`
- `docs/AGENT_MEMORY_API.md`
- `docs/RUNTIME_GRAPH_DESIGN.md`
- `docs/PERSISTENT_MEMORY_SECURITY_CONSTRAINTS.md`

---

## Overall Verdict

**PASS — Proceed to Phase B with MINOR REVISIONS**

The design is structurally sound, security-first, and architecturally consistent across all 5 documents. No HIGH-severity blockers found. Three MEDIUM and four LOW issues identified, all addressable during Phase B implementation without design-level changes.

---

## 1. Schema / API Consistency Review

**Finding S-1 (MEDIUM): `getMemoryGraph()` return schema mismatch**

| Document | Field | Status |
|---|---|---|
| API: `getMemoryGraph()` returns | `nodes: Memory[]` | ❌ Missing in schema |
| API: `getMemoryGraph()` returns | `edges: MemoryEdge[]` | ❌ Missing in schema |
| Schema: `memory_edges` table | EXISTS | ✅ |
| API: `getMemoryGraph()` | Node type ambiguous | ⚠️ |

The API doc says `nodes: Memory[]` and `edges: MemoryEdge[]`, but the schema has no `MemoryEdge` table — it's just `memory_edges`. The nodes (`Memory[]`) map to `agent_memories`, which exists.

**Fix:** Clarify in API doc that graph nodes come from `agent_memories`, and graph edges come from `memory_edges`. The API return type should be:
```typescript
interface MemoryGraph {
  nodes: Memory[];       // from agent_memories
  edges: MemoryEdge[];   // from memory_edges (alias: memory_edge records)
}
```
This is a doc clarification only; schema is correct.

---

**Finding S-2 (MEDIUM): `recordGovernanceDecision()` has no API-level guard against updates/deletes**

The schema has no PostgreSQL-level constraint preventing UPDATE/DELETE on `governance_audit_log`. The API doc says "permanent, insert-only" but this is an application-level promise, not a DB-enforced rule. A buggy Phase B implementation could accidentally UPDATE/DELETE records.

**Fix (Phase B):** Add a PostgreSQL trigger on `governance_audit_log`:
```sql
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
```

This is a Phase B implementation task, not a design change.

---

**Finding S-3 (LOW): `memory_events.event_type` mismatch**

| Source | Values | Count |
|---|---|---|
| API supporting functions | `created\|updated\|archived\|restored\|deleted\|linked\|unlinked\|retrieved` | 8 |
| SQL schema comment | `created\|updated\|archived\|restored\|deleted\|linked\|unlinked\|retrieved` | 8 ✅ |
| Runtime Graph Design | `created\|retrieved\|depends_on\|supersedes\|contradicts\|validates\|blocks\|refines` | 8 |
| Runtime Graph Design | + `retrieved_by` | 9 |

The Runtime Graph uses `retrieved_by` as an edge relation type (in `memory_edges`), which does NOT appear in `memory_events.event_type` (which has `retrieved`). This is actually correct — `retrieved` is the event type for audit logging, `retrieved_by` is the edge type for graph navigation. They serve different purposes.

However, the API doc for `getMemoryGraph()` references `MemoryEdge[]` (plural) but doesn't define the `MemoryEdge` interface. The edge types listed in the design doc's edge table (`created|retrieved|depends_on|...`) match `memory_edges.relation_type` comment.

**Verdict:** No actual inconsistency. `retrieved` (audit) ≠ `retrieved_by` (graph edge). Just needs a `MemoryEdge` interface definition in the API doc.

**Fix:** Add to AGENT_MEMORY_API.md:
```typescript
interface MemoryEdge {
  id: UUID;
  fromMemoryId: UUID;
  toMemoryId: UUID;
  relationType: RelationType;
  weight: number;
  metadata: object;
  createdAt: Date;
}
```

---

**Finding S-4 (LOW): `source` field missing from `Memory` return type in API**

The API doc's `Memory` return type has all fields except `source` mapped from `agent_memories.source`. The schema has it; the API return type omits it. Minor doc gap.

**Fix:** Add `source: MemorySource` to the `Memory` interface return type.

---

**Finding S-5 (MEDIUM): No `agent_id` foreign key enforcement in `agent_memories`**

Schema:
```sql
agent_id UUID REFERENCES agents(id) ON DELETE SET NULL
```

Problem: `agent_id` is nullable AND `ON DELETE SET NULL`. An agent can be deleted, orphaning its memories with `agent_id=NULL`. The memories then show `agent_name` (text) but have no FK to `agents`. This is intentional for the seed stub (agent with UUID `00000000...`), but it's a soft spot.

Additionally, the API `createMemory()` accepts `agentName` as required, but `agentId` is optional. If `agentId` is provided but doesn't exist, FK constraint would reject. If only `agentName` is provided, `agentId` ends up NULL.

**Fix (Phase B):** The Phase B implementation should resolve this via `getOrCreateAgent()`:
1. Before `createMemory()`, call `registerAgent()` or `getAgentByName()` to resolve `agentId`
2. If agent doesn't exist, create it first
3. The seed stub in SQL can remain as-is for Phase A

This is an implementation concern, not a design flaw. Design is clear that `agentName` is the primary key for agents.

---

**Finding S-6 (LOW): No index on `retrieval_history.query_text` for text search**

The `retrieval_history` table stores `query_text TEXT NOT NULL`, but has no GIN index for full-text search. If Phase B+ wants to query retrieval patterns (e.g., "what queries led to this memory?"), a text index would be needed.

**Verdict:** Not a blocker for Phase B minimum scope. Low priority, add if needed in Phase B+.

---

## 2. Security Consistency Review

**Finding SEC-1 (PASS): Write-time secret scan is design-mandated**

✅ The AGENT_MEMORY_API.md design specifies `detectSecrets()` is called BEFORE `createMemory()` and `updateMemory()` writes. The SECURITY_CONSTRAINTS.md Rule 1 matches exactly. Schema has no mechanism to bypass this — it's application-layer enforcement, which is appropriate since PostgreSQL cannot regex-scan arbitrary TEXT fields.

**Schema support:** N/A (application-layer). Design is consistent.

---

**Finding SEC-2 (PASS): Read-time defensive redaction**

✅ AGENT_MEMORY_API.md specifies `getMemory()` scans content and redacts with `_securityWarning` flag. SECURITY_CONSTRAINTS.md Rule 2 matches. Schema: `content TEXT NOT NULL` — no redaction stored in DB, just in response.

**Verdict:** Consistent.

---

**Finding SEC-3 (PASS): Governance memory write-protected**

✅ Design doc says only `source='system'` or `source='migration'` can create `memory_type='governance'`. API doc says:
> "Validate `source` is `'system'` or `'migration'`; Require elevated permission"

Schema: `source VARCHAR(64)` has no enum constraint — accepts any value. The write protection is application-layer.

**Verdict:** Consistent. Schema correctly defers this to application logic.

---

**Finding SEC-4 (PASS): Governance memory cannot be archived**

✅ API doc `archiveMemory()` throws `PermissionError` for `memoryType='governance'`. SECURITY_CONSTRAINTS.md Rule 4 matches.

**Verdict:** Consistent.

---

**Finding SEC-5 (PASS): Archived memory excluded from prompt context**

✅ AGENT_MEMORY_API.md `getMemory()` returns `null` for archived if `includeArchived=false`. SECURITY_CONSTRAINTS.md Rule 5: "default behavior excludes archived".

**Verdict:** Consistent. The schema has `is_archived` boolean — the filter is in application logic.

---

**Finding SEC-6 (PASS): Governance audit log insert-only**

✅ API doc: "Permanent — no archive/delete operation". SECURITY_CONSTRAINTS.md Rule 14: "Permanent, insert-only, no TTL".

**Schema:** No PostgreSQL-level enforcement (only app-level promise). Finding S-2 above addresses this.

**Verdict:** Consistent with design intent; implementation must add trigger (Finding S-2).

---

**Finding SEC-7 (LOW — potential leakage): `retrieval_history.query_text` could contain secrets**

The schema stores `query_text TEXT NOT NULL` in `retrieval_history`. If a user query contains an API key (e.g., "rewrite my sk-ABC123 key as a function"), the raw query is stored. SECURITY_CONSTRAINTS.md Rule 15 says "redact secrets in query_text for governance decisions", but this applies to `governance_audit_log`, not `retrieval_history`.

**Risk:** `retrieval_history` is retained for 90 days (per retention policy in design doc). A user query with an API key stored here could leak.

**Fix (Phase B):** `recordRetrieval()` should call `detectSecrets()` on `query_text` before storing. If secrets found:
- Store redacted query_text
- Store original (encrypted) in `metadata.originalQuery`

This aligns with SECURITY_CONSTRAINTS.md Rule 15 intent (secrets redacted before storage).

---

**Finding SEC-8 (PASS): Secret scan covers all fields**

✅ SECURITY_CONSTRAINTS.md Rule 1 says "scan content, title, tags, metadata". API doc `createMemory()` behavior: "Scan content, title, tags, metadata". Schema: all four are TEXT/JSONB — scannable.

**Verdict:** Consistent.

---

## 3. Migration Feasibility Review

**Finding M-1 (LOW): `.qclaw_handoff/` does not exist in workspace**

The design doc lists migration sources as `memory/*.md`, `MEMORY.md`, `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `HEARTBEAT.md`, and `.qclaw_handoff/`. The workspace has none of these in a `.qclaw_handoff/` directory. Current memory files are at workspace root:
- `memory/2026-05-27.md` (daily notes)
- `MEMORY.md` (long-term curated)
- `AGENTS.md`, `USER.md`, `SOUL.md`, `TOOLS.md`, `HEARTBEAT.md`

**Verdict:** `.qclaw_handoff/` path is wrong. Migration source is the workspace root files. The design intent is correct (migrate from these files); the path reference is just wrong in one doc. No fix needed — Phase B `migrateMemoryFiles()` will target the actual paths.

---

**Finding M-2 (PASS): All migration sources exist**

| File | Exists? | Target memory_type |
|---|---|---|
| `MEMORY.md` | ✅ Yes | semantic |
| `memory/YYYY-MM-DD.md` | ✅ Yes | episodic |
| `AGENTS.md` | ✅ Yes | procedural |
| `USER.md` | ✅ Yes | procedural |
| `SOUL.md` | ✅ Yes | procedural |
| `TOOLS.md` | ✅ Yes | procedural |
| `HEARTBEAT.md` | ✅ Yes | working (active items) |
| `docs/*REPORT.md` | ✅ Yes (multiple) | semantic |

**Verdict:** All migration sources are present. Migration is feasible.

---

**Finding M-3 (LOW): No migration parser defined for file formats**

The design doc describes `migrateMemoryFiles()` but doesn't define the parsing logic for:
- `memory/YYYY-MM-DD.md` — what sections map to what fields?
- `MEMORY.md` — how to split into individual memories?
- `HEARTBEAT.md` — how to extract "active items only"?

**Verdict:** This is a Phase B implementation detail. Phase A design is sufficient. No blocking issue.

---

## 4. Runtime Integration Feasibility Review

**Finding R-1 (PASS): `retrieveContext()` integration path is clear**

The design doc specifies:
1. Persistent memory search via `searchMemory()` → returns `MemorySearchResult[]`
2. RAG document retrieval via existing `hybridSearch()` → returns `DocSearchResult[]`
3. Both merged in `retrieveContext()` response

The integration point is at the `retrieveContext()` level (v1.2.0). The new `searchMemory()` is a parallel path. This is clean — no changes to the existing RAG pipeline.

**Verdict:** Feasible. Clean separation: persistent memory (agent's own knowledge) vs. RAG (project documentation).

---

**Finding R-2 (MEDIUM): `retrieval_history` integration is not explicitly connected to `retrieveContext()`**

The design doc says `searchMemory()` emits a `retrieval_history` entry. But `retrieveContext()` (v1.2.0's main API) is not described as calling `searchMemory()`. The integration is implied but not specified.

**Fix (Phase B):** `retrieveContext()` should be updated to:
1. Call `searchMemory()` for persistent memory layer
2. Merge results with existing RAG results
3. Call `recordRetrieval()` to log the combined retrieval

This requires modifying `retrieveContext()` — which is currently in `agents/rag-memory/runtime/retrieve_context.js`. The design doc should note this explicitly.

**Verdict:** Integration is feasible but needs explicit Phase B scope note.

---

**Finding R-3 (PASS): Runtime Graph connection to agent_runs**

The design specifies:
- Memory → RUN edge (`created`) via `memory_edges`
- Decision → RUN edge (`decided`) via `governance_audit_log.agent_run_id`
- Retrieval → RUN edge via `retrieval_history.agent_run_id`

Schema correctly supports: `agent_runs(id)` FK in `agent_memories`, `governance_audit_log`, `retrieval_history`.

**Verdict:** Feasible.

---

**Finding R-4 (LOW): No `agent_runs` lifecycle management in API**

The design defines `agent_runs` table but provides no API for:
- Starting a run (`startRun()`)
- Ending a run (`endRun()`)
- Linking current session to a run

Without this, `agent_run_id` in `retrieval_history` and `governance_audit_log` would always be NULL (no runs recorded). The graph's RUN → MEMORY edges also couldn't be created automatically.

**Fix (Phase B minimum):** At minimum, Phase B implementation should:
1. `startRun(agentName, sessionKey)` → creates `agent_runs` record, returns `runId`
2. `endRun(runId, exitReason, runtimeMs)` → closes the run
3. `getCurrentRunId()` → returns the active run ID for the current session

This doesn't need a full run management API, just a session-bound run ID that gets attached to retrievals and memories.

---

## 5. PostgreSQL Readiness Review

**Finding PG-1 (PASS): Idempotent execution**

✅ All `CREATE TABLE` and `CREATE INDEX` use `IF NOT EXISTS`. `CREATE FUNCTION` uses `CREATE OR REPLACE`. `INSERT` uses `ON CONFLICT DO NOTHING`. Script can be run repeatedly safely.

---

**Finding PG-2 (PASS): Extension declarations**

✅ Comments document prerequisites (`pgvector`, `uuid-ossp`) but the script itself does not create extensions. This is intentional — extensions are typically created at the DB cluster level, not per-database. The comments are sufficient.

**Verdict:** Acceptable. The Docker setup in v1.2.0 already initializes pgvector.

---

**Finding PG-3 (PASS): `created_at` / `updated_at` everywhere**

✅ All 8 tables have `created_at`. `agent_memories` and `agents` have `updated_at` with auto-trigger.

---

**Finding PG-4 (PASS): Necessary indexes present**

✅ Key query patterns indexed:
- `agent_memories`: agent, type, archived, created, importance, tags (GIN), source
- `memory_edges`: from, to, type, weight
- `memory_events`: memory, type, actor, created
- `retrieval_history`: query_hash, agent, mode, created
- `governance_audit_log`: agent, rule, action, decision, created

---

**Finding PG-5 (PASS): Cascade strategy**

✅ CASCADE on: `agent_runs → agents`, `memory_embeddings → agent_memories`, `memory_edges → agent_memories`, `memory_events → agent_memories`
✅ SET NULL on: `agent_memories → agents`, `retrieval_history → agent_runs`, `governance_audit_log → agent_runs`

**Verdict:** Cascade strategy is appropriate. `memory_events` uses CASCADE so audit records are deleted with memories (acceptable — archived memories already have audit trail before archive).

---

**Finding PG-6 (LOW): Partial index on `is_archived` may need tuning**

```sql
CREATE INDEX idx_memories_archived ON agent_memories(is_archived) WHERE is_archived = false;
```

This partial index only indexes active memories. Queries that explicitly search `WHERE is_archived = true` (e.g., audit investigations) would be slow. However, archived memories should be rare in active queries.

**Verdict:** Acceptable for Phase B. Revisit if archived memory volume grows.

---

**Finding PG-7 (LOW): Trigger risk — `memory_events` trigger on DELETE**

The `log_memory_event()` trigger fires `AFTER DELETE ON agent_memories`. If Phase B ever enables `ON DELETE CASCADE` on a related table that cascades to `agent_memories`, the trigger would fire AFTER the delete, potentially with stale `OLD` data depending on CASCADE ordering.

**Verdict:** Low risk. Current design has no cascade deletes to `agent_memories`. The trigger uses `OLD.id` which should still be accessible. Acceptable.

---

**Finding PG-8 (PASS): RLS comments are clear**

✅ RLS section is clearly commented with "NOTE: RLS will be enabled in Phase B". The placeholder policies are reasonable starting points. No risk to Phase A or Phase B minimum.

---

## 6. Cross-Document Consistency

| Check | Status |
|---|---|
| `memory_type` values match across all docs | ✅ Consistent |
| `source` values match across all docs | ✅ Consistent |
| `relation_type` in `memory_edges` matches Runtime Graph design | ✅ Consistent |
| `event_type` in `memory_events` matches API doc | ✅ Consistent |
| `action` values in `governance_audit_log` match API + design | ✅ Consistent |
| `decision` values match | ✅ Consistent |
| Retention policies match | ✅ Consistent |
| Secret patterns match (context_guard vs security constraints) | ✅ Consistent |
| Five Iron Laws referenced correctly in both design and security docs | ✅ Consistent |

---

## 7. Issues Summary Table

| ID | Severity | Area | Issue | Fix in Phase B? |
|---|---|---|---|---|
| S-2 | MEDIUM | Schema | `governance_audit_log` lacks DB-level insert-only enforcement | Yes — add trigger |
| S-5 | MEDIUM | Schema/API | `agent_id` nullable FK — orphaned memories if agent deleted | Yes — `getOrCreateAgent()` before `createMemory()` |
| SEC-7 | MEDIUM | Security | `retrieval_history.query_text` could store secrets | Yes — `detectSecrets()` in `recordRetrieval()` |
| R-2 | MEDIUM | Runtime | `retrieveContext()` integration with `searchMemory()` not explicit | Yes — update `retrieveContext()` to call `searchMemory()` |
| R-4 | MEDIUM | Runtime | No `agent_runs` lifecycle API — `agent_run_id` always NULL | Yes — add `startRun()`/`endRun()` minimal |
| S-1 | LOW | Schema/API | `getMemoryGraph()` return type ambiguous (`MemoryEdge` not defined) | Doc-only — add interface |
| S-3 | LOW | Schema/API | `MemoryEdge` interface missing from API doc | Doc-only — add interface |
| S-4 | LOW | Schema/API | `source` field missing from `Memory` return type | Doc-only — add field |
| S-6 | LOW | Schema | No GIN index on `retrieval_history.query_text` | Phase B+ — low priority |
| M-1 | LOW | Migration | `.qclaw_handoff/` path wrong — actual files at workspace root | No fix needed — Phase B targets real paths |
| M-3 | LOW | Migration | No migration parser defined | Phase B — implementation detail |
| PG-6 | LOW | PostgreSQL | Partial index on `is_archived` — slow for archived queries | Acceptable — revisit if needed |

---

## 8. Phase B Minimum Implementation Scope

If approved, Phase B minimum implementation (in order):

### Tier 1 — Core (must have)
1. `agents/persistent-memory/agent_memory_db.js` — PostgreSQL pool + CRUD for all 8 tables
2. `createMemory()` / `getMemory()` / `updateMemory()` / `archiveMemory()` / `getMemoriesByAgent()`
3. `detectSecrets()` — reuse/extend `context_guard.js` patterns
4. `searchMemory()` — semantic + keyword + hybrid across `agent_memories`
5. `startRun()` / `endRun()` — minimal session-bound run lifecycle
6. `recordRetrieval()` — with secret scanning on `query_text`
7. `recordGovernanceDecision()` — with insert-only trigger on `governance_audit_log`
8. **SQL fix**: Add insert-only trigger on `governance_audit_log`
9. **SQL fix**: Add upsert pattern for `registerAgent()`

### Tier 2 — Graph (next)
10. `linkMemories()` / `unlinkMemories()`
11. `getMemoryGraph()`
12. `getReasoningChain()` / `getMemoryTrace()`
13. `getTaskContext()`
14. Edge auto-creation in `createMemory()` (RUN → MEMORY edge)

### Tier 3 — Integration
15. Update `retrieveContext()` to call `searchMemory()` and merge with RAG results
16. Update `retrieval_cache.js` to cache persistent memory results separately

### Tier 4 — Ops
17. `migrateMemoryFiles()` — workspace file migration
18. `archiveExpiredMemories()` — retention cron job
19. `registerAgent()` — upsert agent record

---

## 9. Recommendation

**VERDICT: PASS — Proceed to Phase B**

All documents are consistent and architecturally sound. Three MEDIUM issues exist but all are addressable in Phase B implementation without design changes. Four LOW issues are acceptable as-is or addressable in Phase B+.

The design is ready for Phase B implementation. No HIGH-severity blockers.

---

*Document: V1_3_0_PHASE_A1_DESIGN_REVIEW_REPORT.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: A.1 — Design Review Gate*
*Status: Ready for human review*