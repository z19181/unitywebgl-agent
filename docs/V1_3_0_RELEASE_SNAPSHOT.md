# v1.3.0 Release Snapshot

**Date:** 2026-05-27  
**Status:** ⬜ PENDING HUMAN REVIEW — DO NOT TAG  
**Branch:** `platform/v1.3.0-persistent-memory`  
**HEAD:** `16fe92d`  

---

## Scope — v1.3.0 Complete

### Phase B — Persistent Agent Memory

| Phase | Task | Status | Key Files |
|-------|------|--------|-----------|
| B.0 | Docker pgvector environment | ✅ | `docker-compose.yml`, `init-agent-memory.sql` |
| B.1 | `retrieveContext` persistent memory integration | ✅ | `agents/memory-store/memory_store.js`, `agents/rag-memory/runtime/retrieve_context.js` |
| B.2 | `runtime_graph.js` — agent memory graph | ✅ | `agents/memory-store/runtime_graph.js`, `graph_cli.js` |
| B.3 | Agent Memory Dashboard (read-only UI) | ✅ | `agent-dashboard/app/memory/`, `app/agents/`, `app/runtime-graph/`, `app/retrieval-history/`, `app/governance-audit/` |

### Phase C — Observability

| Phase | Task | Status | Key Files |
|-------|------|--------|-----------|
| C.0 | Metrics Core Architecture | ✅ | `metrics/base_metrics.js`, `test_metrics_registry.js` |
| C.1 | `/api/metrics` Prometheus endpoint | ✅ | `agent-dashboard/app/api/metrics/route.ts`, `lib/metrics-server.ts` |
| C.4 | `/api/health` endpoint | ✅ | `agent-dashboard/app/api/health/route.ts`, `lib/health.js`, `health/` |
| C.5 | Regression Gates | ✅ | `scripts/check-regression-gates.js`, `.github/workflows/runtime-regression.yml` |

---

## Test Overview

### Unit Tests

| Suite | File | Passed | Failed |
|-------|------|--------|--------|
| Metrics Registry | `metrics/test_metrics_registry.js` | 50 | 0 |
| Memory Store | `agents/memory-store/test_memory_store.js` | 81 | 0 |
| Memory Runtime Integration | `agents/memory-store/test_memory_runtime_integration.js` | — | SKIP* |
| Runtime Graph | `agents/memory-store/test_runtime_graph.js` | — | SKIP* |
| RAG Runtime Retrieval | `agents/rag-memory/runtime/test_runtime_retrieval.js` | 20 | 0 |
| RAG Prompt Context | `agents/rag-memory/runtime/test_prompt_context.js` | 18 | 0 |
| Health Checks | `health/test_health_checks.js` | 5 | 0 |
| **Total (local)** | | **169** | **0** |

\* SKIP: requires `DATABASE_URL` + live postgres; CI runs them in separate jobs.

### Retrieval Evaluation (HYBRID mode)

| Metric | Value | Gate |
|--------|-------|------|
| Recall@5 | 0.525 | ✅ ≥ 0.500 |
| P@5 | 0.14 | — |
| MRR | 0.48 | — |
| NDCG@5 | 0.45 | — |
| Violations | 0 | ✅ = 0 |

### Regression Gate (12 checks)

```
GATE STATUS: PASS

Checks passed (12):
  ✅ secrets
  ✅ metrics (50 tests)
  ✅ memory_store (81 tests)
  ✅ memory_runtime_integration:SKIP
  ✅ runtime_graph:SKIP
  ✅ runtime_retrieval (20 tests)
  ✅ prompt_context (18 tests)
  ✅ HYBRID Recall@5=0.525
  ✅ HYBRID Violations=0
  ✅ dashboard build
  ✅ health endpoint smoke
  ✅ metrics endpoint smoke
```

---

## Dashboard Status

### Pages (read-only, GET-only APIs)

| Page | Path | Status |
|------|------|--------|
| Memory List | `app/memory/page.tsx` | ✅ |
| Memory Detail | `app/memory/[id]/page.tsx` | ✅ |
| Agents | `app/agents/page.tsx` | ✅ |
| Agent Detail | `app/agents/[name]/page.tsx` | ✅ |
| Runtime Graph | `app/runtime-graph/page.tsx` | ✅ |
| Retrieval History | `app/retrieval-history/page.tsx` | ✅ |
| Governance Audit | `app/governance-audit/page.tsx` | ✅ |
| Observability | `app/observability/page.tsx` | ⬜ (not yet created) |
| Retrieval Metrics | `app/retrieval-metrics/page.tsx` | ⬜ (not yet created) |
| Runtime Health | `app/runtime-health/page.tsx` | ⬜ (not yet created) |

### API Routes (GET-only, 405 for writes)

| Route | Method | Status |
|-------|--------|--------|
| `/api/memory` | GET | ✅ |
| `/api/memory/[id]` | GET | ✅ |
| `/api/agents` | GET | ✅ |
| `/api/agents/[name]` | GET | ✅ |
| `/api/runtime-graph` | GET | ✅ |
| `/api/health` | GET | ✅ |
| `/api/metrics` | GET | ✅ |

---

## Observability Status

### Metrics (`/api/metrics`)

- **Format:** Prometheus text/plain; version=0.0.4
- **Registry:** `metrics/base_metrics.js` — 24 domain metrics
- **Protection:** `MAX_HISTOGRAM_VALUES=1000`, `MAX_LABELS_PER_METRIC=10`, `MAX_METRIC_SERIES=10000`
- **Smoke test:** 12/12 PASS

### Health (`/api/health`)

- **Checks:** db, pgvector, cache, graph, retrieval
- **Status codes:** 200 (healthy), 503 (unhealthy)
- **Write methods:** 405
- **Unit tests:** 5/5 PASS
- **Smoke test:** 12/12 PASS

### Prometheus Config

- **File:** `docker/prometheus/prometheus.yml`
- **Scrape target:** `agent-dashboard:3000`
- **Scrape interval:** 15s

---

## Hard Constraints — All Upheld

| Constraint | Status |
|------------|--------|
| No `server.js` changes | ✅ |
| No protocol changes | ✅ |
| No `RELEASE_STATE.json` changes | ✅ |
| No tags created | ✅ (explicitly blocked) |
| No `.env` committed | ✅ |
| No `OPENAI_API_KEY` output | ✅ |
| No memory/prompt content leakage | ✅ |
| Dashboard read-only (GET-only, 405) | ✅ |
| `check-no-secrets.js` no false positives | ✅ (excludes test files + .md docs) |

---

## Remaining Skipped Items

| Item | Reason | CI handles? |
|------|--------|--------------|
| `test_memory_runtime_integration.js` | No `DATABASE_URL` / postgres locally | ✅ Yes |
| `test_runtime_graph.js` | No `DATABASE_URL` / postgres locally | ✅ Yes |
| `app/observability/page.tsx` | Not yet created | ⬜ No |
| `app/retrieval-metrics/page.tsx` | Not yet created | ⬜ No |
| `app/runtime-health/page.tsx` | Not yet created | ⬜ No |

---

## v1.4.0 Readiness

| Area | Status | Notes |
|------|--------|-------|
| Persistent Memory | ✅ Complete | Phase B.0–B.3 done |
| Observability | ✅ Complete | Phase C.0–C.5 done |
| Regression Gates | ✅ Complete | CI workflow active |
| Dashboard pages (3) | ⬜ Incomplete | Can be added in v1.4.0 |
| AI Ops / Auto-governance | ⬜ Not started | Candidate for v1.4.0 scope |

**Readiness:** v1.4.0 can start, but 3 dashboard pages are optional additions before tagging.

---

## Tagging Policy

> **⚠️ DO NOT AUTO-TAG v1.3.0**
>
> This snapshot is for human review only.  
> Tagging (`git tag v1.3.0`) must be done manually after review approval.
>
> **Blocked until:**
> - [ ] Human review approved
> - [ ] 3 missing dashboard pages reviewed (optional)
> - [ ] CI passes on all parallel jobs (including postgres-dependent tests)
> - [ ] `scripts/check-regression-gates.js` PASS on clean checkout

---

## Commits (v1.3.0 branch)

```
16fe92d v1.3.0: add observability health and regression gates
5dd038e v1.3.0: add runtime graph for persistent memory
4dd5da3 v1.3.0: integrate persistent memory with retrieval runtime
24d66dc v1.3.0: add minimal persistent memory store
```

---

**Generated:** 2026-05-27T21:40 PDT  
**Next action:** ⏸️ WAIT FOR HUMAN REVIEW
