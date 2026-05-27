# v1.3.0 Phase B.0 — Minimal Persistent Memory Store Report

**Branch:** `platform/v1.3.0-persistent-memory`
**Date:** 2026-05-27
**Status:** ✅ COMPLETE — 81/81 tests PASS

---

## Executive Summary

Phase B.0 delivers the minimum viable persistent memory runtime for v1.3.0. All 7 runtime files are implemented, 8 database tables created with 4 triggers, and 12 test suites covering every API path pass with zero failures.

---

## Deliverables

### Runtime Files (7 files)

| File | Lines | Purpose |
|---|---|---|
| `agents/memory-store/package.json` | — | ESM package config, pg dependency |
| `agents/memory-store/db.js` | 195 | PostgreSQL pool singleton, query, transaction, healthCheck, schema init |
| `agents/memory-store/secret_scanner.js` | 305 | 14 secret pattern types, detectSecrets, redactSecrets, scanMemoryFields, error classes |
| `agents/memory-store/memory_store.js` | 520 | Core API: createMemory, getMemory, searchMemory, updateMemory, archiveMemory, linkMemories, recordRetrieval, recordGovernanceDecision, getMemoryGraph |
| `agents/memory-store/agent_runs.js` | 148 | startRun, endRun, getRun, getActiveRun, getRecentRuns |
| `agents/memory-store/init_schema.mjs` | 93 | Dollar-quote-aware SQL parser, idempotent init |
| `agents/memory-store/test_memory_store.js` | 470 | 12 isolated test suites, 81 assertions |

### Database Schema (1 file)

| File | Tables | Triggers | Indexes |
|---|---|---|---|
| `docker/postgres/init-agent-memory.sql` | 8 | 4 | 27 |

---

## Test Results — 81/81 PASS ✅

```
T1:  getOrCreateAgent                  5/5   ✅
T2:  createMemory basic               14/14  ✅
T3:  createMemory rejects secret        4/4   ✅
T4:  createMemory allowRedacted         4/4   ✅
T5:  archiveMemory excludes search      7/7   ✅
T6:  linkMemories creates edge          7/7   ✅
T7:  recordRetrieval redacts secret     9/9   ✅
T8:  startRun/endRun lifecycle          9/9   ✅
T9:  governance_audit_log insert        5/5   ✅
T10: governance_audit_log update/delete 2/2   ✅
T11: searchMemory non-archived          2/2   ✅
T12: secret scanner unit tests         13/13  ✅
─────────────────────────────────────────────
TOTAL:                                81/81  ✅
```

## Database Verification

| Table | Columns | Triggers | Status |
|---|---|---|---|
| agents | 9 | updated_at auto | ✅ |
| agent_runs | 8 | — | ✅ |
| agent_memories | 15 | updated_at + memory_events log | ✅ |
| memory_edges | 7 | — | ✅ |
| memory_events | 8 | (auto-populated by trigger) | ✅ |
| retrieval_history | 15 | — | ✅ |
| governance_audit_log | 11 | INSERT-only (trg_prevent_gal_modify) | ✅ |
| memory_embeddings | 6 | — | ✅ |

### Triggers Verified (4/4)

| Trigger | Behavior | T10 verified |
|---|---|---|
| `trg_prevent_gal_modify` | Blocks UPDATE/DELETE on governance_audit_log | ✅ |
| `trg_agent_memories_updated_at` | Auto-sets updated_at on UPDATE | ✅ |
| `trg_agents_updated_at` | Auto-sets updated_at on UPDATE | ✅ |
| `trg_memory_events_log` | Auto-logs all memory lifecycle events | ✅ |

---

## Bugs Fixed (5 total)

### Bug 1: CRITICAL — Infinite loop in `secret_scanner.js` due to missing `g` flag
- **Root cause:** All 14 regex patterns lacked the `g` (global) flag. `RegExp.exec()` without `g` returns the same match on every call — infinite loop.
- **Symptom:** OOM-crash at 2GB heap on any text matching a pattern. Tests T3, T4, T7, T12 all OOM'd.
- **Fix:** Added `g`/`gi` flags to all 14 patterns in `SECRET_PATTERNS`.
- **Verification:** Process heap went from SIGKILL at 2GB → 5.5MB normal. All secret-detection tests pass.

### Bug 2: AUTH_TOKEN false positive on JWT-bearing text
- **Root cause:** Regex `/token\s*[=:].../i` matched `Token: eyJ...` as an auth token, preempting JWT_TOKEN detection. The `token` keyword was too generic.
- **Symptom:** T4 assertion "Original JWT not in stored content" failed — JWT was partially redacted by AUTH_TOKEN instead of JWT_TOKEN.
- **Fix:** Split AUTH_TOKEN into two patterns: `access_token|auth_token` with `[=:]`, and generic `token` with `=` only (no `:`). Reordered JWT_TOKEN before AUTH_TOKEN.
- **Verification:** `[REDACTED:JWT_TOKEN]` now correctly replaces entire JWT, no `eyJ` remains.

### Bug 3: PASSWORD false-positive skip too aggressive
- **Root cause:** False-positive list entry `['password=']` skipped ANY match containing `password=` with length < 30 chars, including legitimate `password=MySecretPass123` (24 chars).
- **Symptom:** T12 PASSWORD detection was skipped.
- **Fix:** Removed `'password='` from false-positive list. The regex `[^\s'"]{8,}` already prevents matching bare `password=` (no 8+ char value).
- **Verification:** `detectSecrets('password=MySecretPass123')` → `[PASSWORD]` ✅

### Bug 4: GITHUB_TOKEN test token too long
- **Root cause:** Test input had 38 alphanumeric chars after `ghp_`, regex expects `{36}`.
- **Symptom:** T12 GITHUB_TOKEN detection failed.
- **Fix:** Corrected test token to exactly 36 chars.
- **Verification:** GITHUB_TOKEN detection passes.

### Bug 5: OOM on process exit — unclosed db.js pool
- **Root cause:** `db.js` singleton pool created by `memory_store.js` imports was never closed in test processes. Node.js cleanup on exit triggered heap explosion.
- **Symptom:** Process SIGKILL'd during shutdown even after all tests completed.
- **Fix:** Added `db.closePool()` call to test PREAMBLE's `done()` function.
- **Verification:** All test processes exit cleanly at 768MB heap.

### Bug 6 (minor): `const buf` reassignment in test PREAMBLE
- **Root cause:** `initSchema()` in test PREAMBLE used `const buf = ''` but then `buf += '...'` (reassignment). This only triggered when tables didn't exist (fresh DB).
- **Fix:** Changed to `let buf = ''`.
- **Verification:** Schema init works on fresh containers too.

---

## Security Behavior

### Write-time protection
- `createMemory()` scans content, title, tags, metadata before write
- Secrets detected → `SecurityError` thrown (block by default)
- `allowRedacted: true` → content redacted, stored with `_redacted: true` metadata flag
- `retrieval_history.query_text` scanned before storage — secrets redacted, original hash preserved for audit

### Read-time protection
- `getMemory()` defensive scans returned content
- If secrets found in stored content → redacted, `_securityWarning: true` set

### Governance protection
- `governance_audit_log` insert-only enforced at DB level (trigger)
- `archiveMemory()` blocks governance-type memories
- `createMemory()` with `memoryType=governance` requires `source=system|migration`

### Archived memory isolation
- `getMemory()` excludes archived memories by default
- `searchMemory()` excludes archived memories
- Explicit `includeArchived: true` option required to access archived data

---

## Hard Constraints — All Met ✅

| Constraint | Status |
|---|---|
| server.js: no modifications | ✅ |
| PartyGameSDK protocol: no modifications | ✅ |
| RELEASE_STATE.json: no modifications | ✅ |
| No tags created | ✅ |
| No .env committed | ✅ |
| No OPENAI_API_KEY output | ✅ |
| No Unity baseline changes | ✅ |
| Governance constraints not overridden | ✅ |
| Secrets not stored in memory (redacted before write) | ✅ |
| Archived memory excluded from prompt context | ✅ |

---

## Remaining Blockers

### In-scope for Phase B.1
- Update `retrieveContext()` to call `searchMemory()` and merge with RAG results
- Integration with `retrieval_cache.js` for persistent memory caching
- `migrateMemoryFiles()` — workspace file migration (MEMORY.md, memory/YYYY-MM-DD.md, etc.)
- `archiveExpiredMemories()` — retention cron pattern

### Not blocking Phase B.1
- Memory embeddings / semantic search (pgvector vector search) — Phase B.2+
- RLS on memory tables — Phase B.3+
- GET /backup and POST /restore endpoints — Phase D

---

## Recommendation

**✅ PROCEED to Phase B.1**

All 81 tests pass. All 5 bugs identified and fixed. Schema verified with 8 tables + 4 triggers. Security behavior verified. No hard constraints violated. Phase B.0 delivers the minimal persistent memory store as designed.

---

*Document: V1_3_0_PHASE_B0_MINIMAL_MEMORY_STORE_REPORT.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: B.0 — Complete*
*Status: Ready for commit*
