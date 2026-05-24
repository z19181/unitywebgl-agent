# Workflow Commands — PartyGameSDK v1.0.0

**Version:** v1.0.1-governance  
**Inspired by:** Claude-Code-Game-Studios 73-command system  
**Adapted for:** Party game SDK pipeline (9 commands, not 73)

---

## Command Catalog

### `/new-party-game`

```
/new-party-game <game-name> <game-type>
```

**What it does:**
1. Reads `_GameTemplateSkeleton/` as template
2. Creates `UnityExamples/{GameName}TemplateDemo/` directory
3. Generates `Assets/Scripts/Game/{GameName}GameManager.cs`
4. Generates `Assets/Editor/Create{GameName}Scene.cs`
5. Generates `Assets/Editor/{GameName}WebGLBuilder.cs`
6. Generates `BUILD_GUIDE.md`, `GAME_SPEC.md`, `TEST_CHECKLIST.md`

**Gate:** Template structure validated before write.

**Agent:** Unity WebGL Game Agent (delegates to Codex Build Agent)

---

### `/build-webgl`

```
/build-webgl <game-name>
```

**What it does:**
1. Locates `Assets/Editor/{GameName}WebGLBuilder.cs`
2. Runs: `EMSDK_PYTHON=python3.11 Unity -batchmode -executeMethod {GameName}WebGLBuilder.BuildWebGL`
3. Output artifacts to `screen/Build_{GameName}/`

**Constraints:**
- Foreground execution only (no `&` — EMSDK_PYTHON must propagate)
- Proxy may be required for Unity license check

**Agent:** Codex Build Agent

---

### `/check-webgl-build`

```
/check-webgl-build <game-name>
```

**What it does:**
1. Runs `node scripts/check-unity-webgl-build.js screen/Build_{GameName}`
2. Validates 22 checkpoints:
   - Build artifacts exist (loader.js, framework.js, data, wasm)
   - index.html present with correct structure
   - partygame-template.js included
   - PartyGameBridge.jslib referenced
   - No orphaned files
   - Size budget check

**Gate:** 22/22 PASS required.

**Agent:** QA Agent

---

### `/run-release-gate`

```
/run-release-gate <phase>
```

**What it does:**
1. Executes all checks for the specified canary phase
2. Validates blocking conditions
3. Produces phase report
4. Updates `RELEASE_STATE.json` if all checks pass

**Phases:** `phase-2`, `phase-3`, `phase-4`, `phase-5`

**Gate:** All checks PASS, zero blocking conditions.

**Agent:** Release Manager Agent

---

### `/start-canary`

```
/start-canary <percent>
```

**What it does:**
1. Validates prerequisites for the target canary percentage
2. Reads previous phase report
3. Confirms monitoring stack is healthy
4. Updates `RELEASE_STATE.json` to target phase

**Valid values:** `1`, `10`, `50`, `100`

**Agent:** Release Manager Agent (requires DevOps Agent for monitoring check)

---

### `/hotfix`

```
/hotfix "<issue description>"
```

**What it does:**
1. Creates `hotfix/<slug>` branch from v1.0.0
2. Implements the fix
3. Runs full regression test suite
4. Documents in `docs/HOTFIX_REPORT_<date>.md`
5. Creates hotfix tag

**Constraints:**
- Only bugfix/compat — no new features
- Must pass all existing E2E tests
- server.js protocol must remain unchanged
- Tag requires human approval

**Agent:** Platform Agent or Unity WebGL Agent (depends on domain)

---

### `/team-release`

```
/team-release <version>
```

**What it does:**
1. Coordinates Release Manager + QA + DevOps
2. Executes release gate checks
3. Validates monitoring stack
4. Confirms rollback readiness
5. Produces release report
6. **Stops before tagging** (human approval required)

**Agent:** Release Manager Agent (coordinates Platform, DevOps, QA)

---

### `/team-qa`

```
/team-qa <scope>
```

**What it does:**
1. Runs automated E2E test suites
2. Generates manual QA checklist
3. Validates Unity WebGL build artifacts
4. Checks mobile compatibility (iOS Safari, Android Chrome)
5. Produces QA report

**Scopes:** `full`, `webgl-only`, `protocol-only`, `mobile-only`

**Agent:** QA Agent (delegates to Codex Build Agent for WebGL checks)

---

### `/project-stage-detect`

```
/project-stage-detect
```

**What it does:**
1. Reads `RELEASE_STATE.json` for current phase
2. Checks which artifacts exist (builds, reports, docs)
3. Checks which tests have passed
4. Reports current stage and recommended next action

**Output:** Stage report with `/help`-style guidance.

**Agent:** Release Manager Agent

---

## Command → Agent Mapping

| Command | Primary Agent | Delegates To |
|---|---|---|
| `/new-party-game` | Unity WebGL Game Agent | Codex Build Agent |
| `/build-webgl` | Codex Build Agent | — |
| `/check-webgl-build` | QA Agent | — |
| `/run-release-gate` | Release Manager | Platform, DevOps, QA |
| `/start-canary` | Release Manager | DevOps |
| `/hotfix` | Platform or Unity Agent | QA |
| `/team-release` | Release Manager | Platform, DevOps, QA |
| `/team-qa` | QA Agent | Codex Build Agent |
| `/project-stage-detect` | Release Manager | — |

---

## What We Didn't Import from CCGS

| CCGS Command | Why Not Imported |
|---|---|
| `/brainstorm`, `/design-system`, `/design-review` | PartyGameSDK is an SDK, not a game design tool |
| `/create-epics`, `/create-stories`, `/sprint-plan` | PartyGameSDK uses canary phases, not sprints |
| `/perf-profile`, `/balance-check` | Unity Profiler handled externally |
| `/team-combat`, `/team-narrative`, `/team-audio` | Party games don't have narrative/audio teams |
| `/setup-engine` | SDK is fixed to Unity 6 (6000.4.8f1) |
| `/localize`, `/changelog`, `/patch-notes` | Not applicable to SDK distribution |
| All 73 CCGS commands | PartyGameSDK needs 9 focused commands, not 73 |

---

### `/runtime-gate` — WebGL Runtime Pipeline Verification

**Authority:** Unity WebGL Verification Agent

**Invoked:** After `Unity batchmode Build` completes and `check-unity-webgl-build.js` passes.

**Gates:**
1. Browser Static Load (8 assets → 200)
2. DOM Integrity (canvas, loader, partygame refs)
3. Runtime Visual (canvas renders, no black screen, no shader errors)
4. Runtime E2E (5-channel loop: controller → PartyGameBridge → Unity → broadcast → controller)

**Reference:** `UnityExamples/WEBGL_RUNTIME_PIPELINE.md`

**Golden Template:** `UnityExamples/_RuntimeVerifiedTemplate/`

**Blocking:** Any gate failure halts release. Cannot proceed to game template creation until ALL GATES CLEAR.

```
/runtime-gate UnityExamples/JumpJumpTemplateDemo/WebGLBuild_CurrentScene
→ Gate 1: Static Load ... PASS
→ Gate 2: DOM Integrity ... PASS
→ Gate 3: Runtime Visual ... MANUAL_VERIFIED
→ Gate 4: Runtime E2E ... PASS
🏁 ALL GATES CLEAR
```

### `/runtime-automation` — WebGL Runtime Automation Certification

**Authority:** Runtime Automation Agent (v1.1.0)

**Invoked:** After `/runtime-gate` passes, to run the automated certification.

**Execution:**
1. `npx playwright test --config=tests/runtime/playwright.config.ts`
2. Collects console errors, screenshots, WS traces
3. Asserts: canvas not black, runtime hooks available, 5-channel loop
4. Generates `artifacts/test-results.json`

**Blocking:** Any test failure = certification FAILED.

```
/runtime-automation
→ runtime-visual.spec.ts ... PASS
→ runtime-e2e.spec.ts ... PASS
→ controller-input.spec.ts ... PASS
✅ Runtime Certification: PASS
```

**Reference:**
- `tests/runtime/` — Playwright test suite
- `docs/RUNTIME_FAILURE_MATRIX.md` — Triage guide
- `.github/workflows/runtime-e2e.yml` — CI

---

**Adapted from:** Claude-Code-Game-Studios workflow command system  
**Design principle:** 9 focused commands > 73 generic ones for this domain

---

### `/rag-query` — RAG Memory Retrieval

**Authority:** RAG Memory Agent (v1.1.1)

**Invoked:** Before any code modification. Retrieves historical context.

**Usage:**
```
/rag-query black screen WebGL
→ Category: material-failure
→ Retrieved: RUNTIME_FAILURE_MATRIX.md §4, UNITY_WEBGL_MATERIAL_POLICY.md §1-2
→ Action: Replace with URP Simple Lit
```

**Reference:** `docs/RAG_RETRIEVAL_POLICY.md`, `agents/rag-memory/`

---

### `/triage` — Runtime Failure Classification

**Authority:** Runtime Triage Agent (v1.1.1)

**Invoked:** When a runtime test fails. Auto-classifies and suggests recovery.

**Usage:**
```
/triage --type black-screen
→ RTE-004 | CRITICAL | HDRP material or missing camera
→ Recovery: Replace with WebGL-safe shaders
```

**Reference:** `agents/runtime-triage/`, `docs/RUNTIME_FAILURE_MATRIX.md`

---

### `/dashboard` — Agent Intelligence Console

**Authority:** Agent Dashboard (v1.1.2)

**Routes:**
- `/` — Overview: agent landscape, KPIs, recent activity
- `/agents` — 13 agents with status, type, tasks, failures
- `/runtime` — RTE codes, severity, recovery plans, trends
- `/cost` — Token usage, model breakdown, cost history
- `/rag` — Retrieval queries, categories, top docs
- `/builds` — Game builds, checks, duration, release gates
- `/release` — Canary phase, rollout %, gate checklist, rollback
- `/artifacts` — Screenshots, logs, traces, snapshots

**Access:** `http://localhost:3000` after `cd agent-dashboard && npm run dev`
