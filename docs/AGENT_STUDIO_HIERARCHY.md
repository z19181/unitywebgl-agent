# Agent Studio Hierarchy — PartyGameSDK v1.0.0

**Version:** v1.0.1-governance  
**Inspired by:** Claude-Code-Game-Studios 3-tier hierarchy  
**Adapted for:** Unity WebGL multi-screen party game SDK

---

## Hierarchy (2-Tier: Lead + Specialist)

PartyGameSDK uses a lean 2-tier model. We dropped the "Director" tier because the SDK is a focused product with clear scope boundaries.

```
                    Release Manager
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    Platform Agent   Unity WebGL     DevOps Agent
         │           Game Agent           │
         │               │               │
    ┌────┴────┐    ┌────┴────┐    ┌──────┴──────┐
    │         │    │         │    │             │
  Docs    Security  Codex   QA   Performance  Nginx/WSS
  Agent   Agent    Build   Agent   Agent       Agent
                   Agent
```

---

## Agent Definitions

### Tier 1: Release Manager Agent

| Field | Value |
|---|---|
| Domain | Full SDK lifecycle, phase gates, canary advancement |
| Authority | Can advance canary phases; cannot tag without human approval |
| Reads | `RELEASE_STATE.json`, all phase reports, all docs |
| Writes | Phase reports, RELEASE_STATE.json phase/status fields |
| Forbidden | Modifying server.js, protocol, iron laws, game_message.type |
| Escalation | Blocks phase advancement; requires human to unblock |

### Tier 2: Platform Agent

| Field | Value |
|---|---|
| Domain | server.js, protocol, controllers, screen, room management |
| Authority | Can modify platform code within protocol constraints |
| Reads | `server/**`, `controller/**`, `screen/**` |
| Writes | Platform code, E2E tests |
| Forbidden | Breaking 5 iron laws, altering game_message routing |
| Escalation | Protocol changes → Release Manager |

### Tier 2: Unity WebGL Game Agent

| Field | Value |
|---|---|
| Domain | Unity game templates, WebGL builds, game logic |
| Authority | Can create/modify game templates from _GameTemplateSkeleton |
| Reads | `UnityExamples/**`, `Assets/Scripts/Game/**` |
| Writes | Game scripts, Editor builders, scene creators |
| Forbidden | Modifying PartyGameBridge.jslib, Platform scripts, WebGL Template |
| Escalation | Template changes → Release Manager |

### Tier 2: DevOps Agent

| Field | Value |
|---|---|
| Domain | Docker, Nginx, WSS, monitoring stack, deployment |
| Authority | Can start/stop/restart Docker services |
| Reads | `docker/**`, `server/metrics/**`, `server/admin.js` |
| Writes | Docker compose files, nginx configs, deployment docs |
| Forbidden | Modifying server.js protocol logic |
| Escalation | Infrastructure changes → Release Manager |

---

## Specialist Agents (Tier 3)

### Codex Build Agent

| Field | Value |
|---|---|
| Domain | Unity batchmode WebGL builds |
| Input | Builder class path (`Assets/Editor/{Game}WebGLBuilder.cs`) |
| Output | `screen/Build_{Game}/` artifacts + build log |
| Gate | `check-unity-webgl-build.js` → 22/22 PASS |
| Key constraint | `EMSDK_PYTHON=python3.11`, foreground execution only |

### QA Agent

| Field | Value |
|---|---|
| Domain | E2E test execution, build validation, canary verification |
| Tools | `scripts/check-unity-webgl-build.js`, E2E test suites |
| Gate | All test suites must PASS before phase advancement |
| Output | Test reports, QA logs |

### Docs Agent

| Field | Value |
|---|---|
| Domain | Documentation generation, template filling, report writing |
| Templates | `docs/templates/*.md` |
| Forbidden | Modifying technical content without domain agent review |
| Output | Release reports, handoff docs, spec docs |

### Performance Agent

| Field | Value |
|---|---|
| Domain | Metrics monitoring, Grafana dashboard, alert rules |
| Reads | Prometheus metrics, container health |
| Authority | Can recommend phase blocks based on metric thresholds |
| Forbidden | Modifying production configs |

### Security Agent

| Field | Value |
|---|---|
| Domain | WSS validation, token security, input sanitization |
| Reads | `hooks/validate-iron-laws.sh` |
| Authority | Can block phase advancement for security violations |
| Forbidden | Modifying core protocol |

---

## Coordination Rules

### Vertical Delegation

- Release Manager → delegates to Platform/Unity/DevOps leads
- Leads → delegate to specialists
- No tier-skipping for complex decisions

### Horizontal Boundaries

| Boundary | Rule |
|---|---|
| Platform ↔ Unity | Platform never parses game logic; Unity never touches network |
| DevOps ↔ Platform | DevOps configures infra; Platform owns protocol |
| Docs ↔ All | Docs records decisions; never makes them |

### Conflict Resolution

| Conflict type | Escalates to |
|---|---|
| Protocol design | Release Manager |
| Build failure | Unity WebGL Agent + Codex Build Agent |
| Deploy issue | DevOps Agent |
| Phase gate block | Release Manager (human confirmation) |
| Security finding | Security Agent → Release Manager |

### Collaboration Protocol (adapted from CCGS)

```
Question → Options → Decision → Draft → Approval → Write
```

Every agent MUST:
1. Ask clarifying questions before acting
2. Present options with trade-offs
3. Get human decision on choices
4. Show draft before writing files
5. Request explicit "May I write to [path]?" before file operations
6. Never commit without human instruction

---

## Invariant Rules (all agents)

1. Controller sends input only — never playerIndex
2. Server assigns playerIndex — never parses game_message.type
3. Screen/Unity handles game logic — server is router only
4. Unity broadcasts state changes — one source of truth
5. Controller updates UI from state — no guessing
6. `RELEASE_STATE.json` phase changes require human approval
7. Tags require human approval

---

**Adapted from:** Claude-Code-Game-Studios 3-tier agent hierarchy  
**Why 2-tier:** PartyGameSDK is a focused SDK, not a full game studio  
**What we dropped:** Director tier, engine-specialist agents (Godot/Unreal), art/audio/narrative agents

---

## v1.1.1: Agent Intelligence Layer (4 new agents)

| Agent | Tier | Responsibility |
|---|---|---|
| RAG Memory Agent | Support | Pre-modification context retrieval from docs/, reports/, governance |
| Runtime Triage Agent | Specialist | Classify runtime failures → RTE-001~008 + recovery plan |
| Token Cost Agent | Support | Track token usage, cost, latency, cache hits → Prometheus |
| Model Router Agent | Orchestrator | Route tasks to Cheap/Strong model based on complexity |

**Total agents:** 9 (5 original + 4 intelligence layer)
