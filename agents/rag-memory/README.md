# RAG Memory Agent — v1.1.1

**Type:** Memory & Retrieval Agent  
**Authority:** Pre-modification context retrieval  
**Depends on:** PartyGameSDK workspace docs/, reports/, governance

---

## Purpose

Before any Agent (QClaw, Codex, or downstream) modifies PartyGameSDK code, the RAG Memory Agent retrieves relevant historical context: past failures, governance rules, material policies, and runtime reports.

## Architecture

```
Modification Request
  → ingest.js (vectorize docs/)
  → retrieve.js (semantic search)
  → Agent context injected
  → Modification proceeds with full history
```

## Data Sources

| Source | Content | Priority |
|---|---|---|
| `docs/RUNTIME_FAILURE_MATRIX.md` | 8 failure categories | HIGH |
| `docs/RUNTIME_ARTIFACT_POLICY.md` | Artifact retention rules | MEDIUM |
| `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md` | Material rules | HIGH |
| `UnityExamples/WEBGL_RUNTIME_PIPELINE.md` | 5-gate pipeline | HIGH |
| `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md` | Automation design | MEDIUM |
| `docs/PATH_SCOPED_RULES.md` | Per-directory rules | HIGH |
| `docs/GOVERNANCE_LAYER_REPORT.md` | Governance decisions | HIGH |
| `docs/WORKFLOW_COMMANDS.md` | Available commands | MEDIUM |
| `UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md` | Template frozen state | HIGH |
| `UnityExamples/GAME_TEMPLATE_FACTORY.md` | Template factory rules | HIGH |
| `PARTY_GAME_SDK_FINAL_HANDOFF.md` | Release history | HIGH |
| `RELEASE_INDEX.md` | Version timeline | MEDIUM |
| `CODEX_RESULT.md` | Codex output log | HIGH |
| `docs/RUNTIME_FAILURE_MATRIX.md` | Failure taxonomy | HIGH |
| `*.md` release reports | v0.1.0–v0.4.2 decisions | MEDIUM |
| `SCREEN_WEBGL_RUNTIME_FIX_REPORT.md` | Screen fix history | HIGH |

## Retrieval Triggers

RAG retrieval is **mandatory** before:

| Trigger | Retrieve |
|---|---|
| Modifying screen/index.html | `RUNTIME_FAILURE_MATRIX.md`, screen fix reports |
| Modifying controller/index.html | 5-channel E2E reports, desync failures |
| Adding new game template | `UNITY_WEBGL_MATERIAL_POLICY.md`, `GAME_TEMPLATE_FACTORY.md` |
| Modifying Unity scripts | Material policy, pipeline gates |
| Debugging black screen | `RUNTIME_FAILURE_MATRIX.md` §4 |
| Debugging WebSocket | `RUNTIME_FAILURE_MATRIX.md` §5 |
| Any server.js change | **BLOCKED** — Five Iron Laws |
| Any protocol change | **BLOCKED** — Five Iron Laws |

## Semantic Categories

| Category | Key Phrases |
|---|---|
| `material-failure` | "black screen", "pink shader", "HDRP", "missing shader", "WebGL material" |
| `wasm-failure` | "wasm fail", "loader timeout", "cannot load wasm" |
| `websocket-failure` | "controller disconnect", "WS fail", "desync" |
| `build-failure` | "build error", "batchmode fail", "26/26 check" |
| `governance` | "Five Iron Laws", "BLOCKING", "gate check", "invariant" |
| `runtime-e2e` | "5-channel", "PartyGameBridge", "state_update", "broadcast" |

## Implementation Notes

- `ingest.js` reads markdown files, chunks by heading, embeds text
- `retrieve.js` accepts a query string, returns top-k relevant chunks
- Vector store: in-memory or local JSON (no external dependency)
- Embeddings: lightweight (tf-idf or sentence-transformers via Node)
- Not production-scale — designed for in-session QClaw context injection

## Integration

```
QClaw receives modification request
  → RAG Memory Agent queries: "black screen" → retrieves §4 of FAILURE_MATRIX
  → Context injected into QClaw prompt
  → QClaw knows: "black screen = HDRP or missing shader"
  → Proceeds with informed fix
```
