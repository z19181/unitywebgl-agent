# v1.3.0 Phase B.2 — Runtime Graph Report

**Branch:** `platform/v1.3.0-persistent-memory`
**Date:** 2026-05-27
**Status:** ✅ COMPLETE — 204/204 tests PASS across 5 suites

---

## Executive Summary

Phase B.2 adds a runtime graph layer to persistent memory, enabling relationship tracking, decision audit trails, contradiction detection, and superseded analysis. The graph is virtualized over existing tables (`memory_edges`, `agent_memories`, `retrieval_history`, `governance_audit_log`) with no schema changes required.

---

## Graph Schema Usage

### Node Types (resolved from existing tables)

| Node Type | Source Table | Example Label |
|---|---|---|
| `agent` | `agents` | "qclaw", "release-manager" |
| `memory` | `agent_memories` | "Five Iron Laws", "Bug fix: regex g flag" |
| `retrieval` | `retrieval_history` | "What fixed the secret scanner bug?" |
| `decision` | `governance_audit_log` | "secret_scanner_validation → allow" |

### Edge Types (stored in memory_edges + virtual FK edges)

| Edge Type | Storage | Meaning |
|---|---|---|
| `created` | Virtual (FK) | Agent created a memory |
| `retrieved` | Virtual | Retrieval touched a memory |
| `depends_on` | memory_edges | Memory B depends on memory A |
| `supersedes` | memory_edges | New version replaces old |
| `contradicts` | memory_edges | Two memories conflict |
| `validates` | memory_edges | Memory confirms/validates another |
| `blocks` | memory_edges | Memory blocks an action |
| `references` | memory_edges | Cross-reference between memories |
| `derived_from` | memory_edges | Derived from another memory |
| `archived_by` | Virtual | Archive event |

---

## Implemented APIs

### Runtime Graph Store (`runtime_graph.js`)

| API | Input | Output |
|---|---|---|
| `getMemoryGraph(memoryId, depth)` | Memory UUID, traversal depth | Nodes + edges centered on memory |
| `getAgentGraph(agentName, limit)` | Agent name, max memories | All agent's memories + edges |
| `getDecisionTrail(memoryId)` | Memory UUID | Governance decisions affecting this memory |
| `getRetrievalTrail(queryHash)` | Query hash | Retrieval history + associated memories |
| `getRelatedMemories(memoryId, types)` | Memory UUID, optional type filter | Connected memories with edge details |
| `findContradictions(memoryId)` | Memory UUID | Outgoing/incoming contradiction edges |
| `findSupersededMemories(memoryId)` | Memory UUID | Superseded + superseding memories |
| `getGraphSummary(agentName)` | Optional agent filter | Total counts, top relations |
| `createGraphNode(type, id, meta)` | Node type, entity ID | Resolved node with label + data |
| `createGraphEdge(from, to, type)` | Two nodes, edge type | Edge in memory_edges or virtual |
| `deleteGraphEdge(edgeId)` | Edge UUID | Delete non-governance edges |

### Graph Query CLI (`graph_cli.js`)

```
node graph_cli.js memory <memoryId>      — Memory graph
node graph_cli.js agent <agentName>      — Agent graph
node graph_cli.js retrieval <queryHash>  — Retrieval trail
node graph_cli.js decision <memoryId>    — Decision trail
node graph_cli.js related <memoryId>     — Related memories
node graph_cli.js contradictions <id>    — Contradiction analysis
node graph_cli.js superseded <id>        — Superseded analysis
node graph_cli.js summary [agent]        — Graph summary stats
```

Output formats: `--json` (JSON) or default (readable summary).

---

## Automatic Graph Writes

| Trigger | Edge Created |
|---|---|
| `createMemory()` | agent → memory (`created`, virtual via FK) |
| `linkMemories()` | memory → memory (persisted in memory_edges) |
| `recordRetrieval()` | retrieval → memory (`retrieved`, via retrieved_memory_ids) |
| `recordGovernanceDecision()` | decision recorded in governance_audit_log (linked in trail) |
| `archiveMemory()` | Archive event logged (`archived_by`, virtual) |

---

## Graph Safety Behavior

| Protection | Mechanism |
|---|---|
| Secrets in graph metadata | Scanned by secret_scanner before edge/node creation |
| Archived in active graph | Excluded by default (`includeArchived=false`) |
| Governance edge deletion | `deleteGraphEdge()` blocks validates/blocks/governance edges |
| Governance audit append-only | DB trigger `trg_prevent_gal_modify` |
| Self-referencing edges | Blocked in `createGraphEdge()` |

---

## Graph Query Example

```
$ node graph_cli.js agent test-agent-b2

=== Graph ===
Nodes: 6
  🤖 [agent] test-agent-b2
  🧠 [memory] Five Iron Laws
  🧠 [memory] Bug fix: regex g flag
  🧠 [memory] Updated regex patterns v2
  🧠 [memory] Old regex pattern (deprecated)
  🧠 [memory] Graph test memory
  🧠 [memory] Temp working memory [ARCHIVED]

Edges: 5
  [agent] → [memory] : created (w=1.00)
  [memory] 📎→ [memory] : depends_on (w=1.00)
  [memory] 🔄→ [memory] : supersedes (w=1.00)
  [memory] ✅→ [memory] : validates (w=1.00)
  [memory] ⚠️→ [memory] : contradicts (w=1.00)
```

---

## Test Results — 204/204 PASS

### Suite 1: Memory Store Regression
```
81/81 PASS ✅ (T1-T12)
```

### Suite 2: Memory Runtime Integration
```
38/38 PASS ✅ (I1-I9)
```

### Suite 3: Runtime Graph (NEW)
```
G1:  createMemory creates graph node/edge        4/4   ✅
G2:  getMemoryGraph returns neighbors            6/6   ✅
G3:  getAgentGraph shows created memories        5/5   ✅
G4:  getDecisionTrail governance path            2/2   ✅
G5:  getRelatedMemories filters by type          5/5   ✅
G6:  findContradictions works                    4/4   ✅
G7:  findSupersededMemories works                5/5   ✅
G8:  getRetrievalTrail history                   2/2   ✅
G9:  Graph metadata redacts secrets              4/4   ✅
G10: Governance edges cannot be deleted          2/2   ✅
G11: getGraphSummary stats                       6/6   ✅
G12: Archived excluded from agent graph          2/2   ✅
──────────────────────────────────────────────────────
SUBTOTAL:                                        47/47  ✅
```

### Suite 4: RAG Runtime Retrieval
```
20/20 PASS ✅ (T1-T10)
```

### Suite 5: Prompt Context
```
18/18 PASS ✅ (T1-T10)
```

---

## Files Changed

### New (3 files)

| File | Lines | Purpose |
|---|---|---|
| `agents/memory-store/runtime_graph.js` | 480 | Core graph store: nodes, edges, traversals, safety |
| `agents/memory-store/graph_cli.js` | 175 | CLI for querying graph (memory, agent, retrieval, decision) |
| `agents/memory-store/test_runtime_graph.js` | 430 | 12 graph tests (G1-G12) |

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
| No secrets in graph metadata | ✅ (scanned before create) |
| Archived excluded from active graph | ✅ (G12 verified) |
| Governance edges cannot be deleted | ✅ (G10 verified) |
| Persistent graph does not override governance | ✅ |

---

## Remaining Blockers

### In-scope for Phase B.3 — Agent Memory Dashboard
- Visualization of graph structure (nodes/edges rendering)
- Agent memory usage view
- Timeline of memory evolution
- Dashboard UI for browsing/querying memories

### Not blocking Phase B.3
- pgvector semantic search on memory embeddings (Phase B.4)
- RLS enforcement on memory tables (Phase D)
- Backup/restore endpoints (Phase D)

---

## Recommendation

**✅ PROCEED to Phase B.3 — Agent Memory Dashboard**

All 204 tests pass across 5 suites. The runtime graph provides relationship tracking, decision audit trails, contradiction detection, and superseded analysis. Graph safety is enforced with secret scanning, governance edge protection, and archived memory exclusion.

---

*Document: V1_3_0_PHASE_B2_RUNTIME_GRAPH_REPORT.md*
*Branch: platform/v1.3.0-persistent-memory*
*Phase: B.2 — Complete*
*Status: Ready for commit*
