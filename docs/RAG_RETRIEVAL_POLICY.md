# RAG Retrieval Policy — v1.1.1

**Version:** v1.1.1  
**Authority:** RAG Memory Agent  
**Scope:** All agent code modifications in PartyGameSDK

---

## 1. Mandatory Pre-Modification Retrieval

Before any Agent (QClaw, Codex, or downstream) modifies PartyGameSDK code, the RAG Memory Agent MUST be consulted.

### Files Requiring Pre-Modification Retrieval

| Path | Required Retrieval |
|---|---|
| `screen/index.html` | `RUNTIME_FAILURE_MATRIX.md`, `SCREEN_WEBGL_RUNTIME_FIX_REPORT.md`, `WEBGL_RUNTIME_PIPELINE.md` |
| `controller/index.html` | `RUNTIME_FAILURE_MATRIX.md` §6, `WEBGL_RUNTIME_PIPELINE.md` §C |
| `Assets/Scripts/**` | `UNITY_WEBGL_MATERIAL_POLICY.md`, `PATH_SCOPED_RULES.md` UNI-006 |
| `Assets/Materials/**` | `UNITY_WEBGL_MATERIAL_POLICY.md` §1-2, §7 |
| `Assets/Shaders/**` | `UNITY_WEBGL_MATERIAL_POLICY.md` §2, §6 |
| `Assets/Textures/**` | `UNITY_WEBGL_MATERIAL_POLICY.md` §5 |
| `docs/templates/**` | `GAME_TEMPLATE_FACTORY.md`, `AGENT_GAME_GENERATION_PROMPT.md` |
| `**/partyGameBridge.*` | `RUNTIME_FAILURE_MATRIX.md` §8, runtime-e2e.spec.ts |
| `.github/workflows/**` | `WEBGL_RUNTIME_AUTOMATION_PLAN.md` |

### Files PROHIBITED from Modification

| Path | Reason |
|---|---|
| `server/server.js` | Five Iron Laws — server is protocol boundary |
| Core protocol (`game_message` structure) | Five Iron Laws — protocol is invariant |
| `RELEASE_STATE.json` | Release state managed by release pipeline only |
| Git tags | Tags are immutable history |

---

## 2. Retrieval Categories

| Category | Key Query Terms | Reference Docs |
|---|---|---|
| `material-failure` | "black screen", "pink shader", "HDRP", "missing material" | `RUNTIME_FAILURE_MATRIX.md` §3-4, `UNITY_WEBGL_MATERIAL_POLICY.md` |
| `loader-failure` | "loader 404", "cannot load", "blank page" | `RUNTIME_FAILURE_MATRIX.md` §1 |
| `wasm-failure` | "wasm error", "loading stuck", "timeout" | `RUNTIME_FAILURE_MATRIX.md` §2 |
| `websocket-failure` | "disconnect", "WS error", "connection failed" | `RUNTIME_FAILURE_MATRIX.md` §5 |
| `e2e-failure` | "state_update missing", "broadcast", "controller desync" | `RUNTIME_FAILURE_MATRIX.md` §6, §8 |
| `governance` | "Five Iron Laws", "BLOCKING", "invariant", "gate" | `PATH_SCOPED_RULES.md`, `GOVERNANCE_LAYER_REPORT.md` |
| `build-failure` | "build error", "batchmode", "check-unity" | `WEBGL_RUNTIME_PIPELINE.md` §B Gate 1 |
| `release` | "canary", "rollback", "rollout", "phase" | `RELEASE_INDEX.md`, `V0_4_*_RELEASE_REPORT.md` |

---

## 3. Prohibited Behaviors

### 3.1 Blind Modification

> **Forbidden:** Modifying code without prior RAG retrieval.
> 
> **Example violation:** "I'll change the shader to HDRP Lit" without checking `UNITY_WEBGL_MATERIAL_POLICY.md`.
> 
> **Correct:** Query RAG: "HDRP shader WebGL" → returns §2: "HDRP — not supported in WebGL. Instant black screen." → Agent chooses URP Simple Lit instead.

### 3.2 Repeating Historical Failures

> **Forbidden:** Making a change that has been documented as a failure before.
>
> **Example violation:** Changing `loaderUrl` to a path that previously caused 404 (documented in `SCREEN_WEBGL_RUNTIME_FIX_REPORT.md`).
>
> **Correct:** RAG retrieval surfaces the historical fix report → Agent knows which paths work.

### 3.3 Ignoring Governance

> **Forbidden:** Modifying a file without checking `PATH_SCOPED_RULES.md` for per-directory constraints.
>
> **Example violation:** Adding HDRP material to `Assets/Materials/` without checking UNI-006.
>
> **Correct:** RAG query "Materials WebGLSafe" → returns UNI-006 BLOCKING rule → Agent places in `WebGLSafe/`.

---

## 4. Retrieval Workflow

```
1. Agent receives modification request
2. Agent queries RAG Memory Agent:
   - File path → required retrieval list (from §1)
   - Task description → category match (from §2)
3. RAG returns top-5 relevant chunks with sources
4. Agent reads retrieved documents if not in context
5. Agent checks for historical failure matches
6. Agent checks for governance rule violations
7. If all clear → proceed with modification
8. If blocked → report to user with citation
```

---

## 5. Enforcement

| Mechanism | How |
|---|---|
| Agent SOUL instructions | Every agent's SOUL.md includes mandatory RAG consultation |
| Model Router | Routes "modify" tasks through RAG check |
| Runtime Triage | Checks if failure matches known historical pattern |
| Code review hook | `hooks/validate-iron-laws.sh` catches protocol violations |

---

**Policy Version:** v1.1.1  
**Effective Date:** 2026-05-24
