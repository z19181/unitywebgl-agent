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

**Adapted from:** Claude-Code-Game-Studios workflow command system  
**Design principle:** 9 focused commands > 73 generic ones for this domain
