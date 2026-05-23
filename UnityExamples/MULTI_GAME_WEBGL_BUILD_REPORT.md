# Multi-Game WebGL Build Queue Report

**Date:** 2026-05-23 16:53 PDT
**Status:** ✅ PASS — 4/4 games built and verified
**Commit:** `2a37fa2` | Branch: `platform/v0.4.2`

---

## 1. Summary Conclusion

### Multi-Game Build Queue: PASS

Four game templates built in sequence using the unified Codex Build Pipeline:

| Priority | Game | Build | Check | Attempts |
|---|---|---|---|---|
| — | JumpJump | ✅ PASS | 22/22 | 6 |
| 1 | Snake | ✅ PASS | 22/22 | 6 |
| 2 | 2048 | ✅ PASS | 22/22 | 2 |
| 3 | Breakout | ✅ PASS | 22/22 | 2 |

### Capability Verified

- **Game Template Factory** — bulk build capability verified with 4 distinct game types
- **Codex Build Pipeline** — reusable across game templates; only `-executeMethod` and `-projectPath` differ
- **EMSDK_PYTHON** — mandatory env var for Unity 6000.4.8f1; foreground execution required

---

## 2. Game Matrix

### 2.1 JumpJump (Baseline)

| Field | Value |
|---|---|
| Build status | ✅ PASS |
| Build output | `screen/Build/` |
| Check result | 22/22 |
| Builder script | `JumpJumpWebGLBuilder.BuildWebGL` |
| Validation report | `UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` |
| Attempts | 6 (attempts 1–5: Emscripten JSONDecodeError; attempt 6: EMSDK_PYTHON fix) |
| Fixes applied | EMSDK_PYTHON=python3.11, debugSymbols→debugSymbolMode, Arial→LegacyRuntime, outputSize→totalSize, uGUI added to manifest |
| Notes | This is the reference build that proved the pipeline works |

### 2.2 Snake

| Field | Value |
|---|---|
| Build status | ✅ PASS |
| Build output | `screen/Build_Snake/` |
| Check result | 22/22 |
| Builder script | `SnakeWebGLBuilder.BuildWebGL` |
| Validation report | `UnityExamples/SnakeTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` |
| Attempts | 6 |
| Issues encountered | Attempt 1: Arial.ttf in CreateSnakeScene.cs (3 refs). Attempts 2–5: bee_backend ExitCode 4 with corrupted ProjectSettings. Attempt 6: foreground build + clean scaffolding succeeded. |
| Fixes applied | Arial.ttf→LegacyRuntime.ttf (CreateSnakeScene.cs). Removed JumpJump ProjectSettings (GUID conflict). Reused Library across attempts. Foreground execution. |

**Shared assets verified at `screen/Build_Snake/`:**

| File | Size |
|---|---|
| Build_Snake.data | 3.8 MB |
| Build_Snake.framework.js | 381 KB |
| Build_Snake.loader.js | 27 KB |
| Build_Snake.wasm | 15.6 MB |
| index.html | 5.3 KB |
| partygame-template.js | 6.2 KB |

### 2.3 2048

| Field | Value |
|---|---|
| Build status | ✅ PASS |
| Build output | `screen/Build_2048/` |
| Check result | 22/22 |
| Builder script | `Game2048WebGLBuilder.BuildWebGL` |
| Validation report | `UnityExamples/_2048TemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` |
| Attempts | 2 |
| Issues encountered | Attempt 1: Arial.ttf in Create2048Scene.cs (2 refs: line 95 CreateText, line 147). Project scaffolding from skeleton (Platform scripts, PartyGameBridge.jslib, PartyGameTemplate). |
| Fixes applied | Arial.ttf→LegacyRuntime.ttf (Create2048Scene.cs). Created full game management: Game2048Manager.cs (4×4 grid, swipe merge, score), Create2048Scene.cs (scene scaffolding), Game2048WebGLBuilder.cs (batch build). |

**Shared assets verified at `screen/Build_2048/`:**

| File | Size |
|---|---|
| Build_2048.data | 3.8 MB |
| Build_2048.framework.js | 380 KB |
| Build_2048.loader.js | 19 KB |
| Build_2048.wasm | 15.6 MB |
| index.html | 5.3 KB |
| partygame-template.js | 6.2 KB |

### 2.4 Breakout

| Field | Value |
|---|---|
| Build status | ✅ PASS |
| Build output | `screen/Build_Breakout/` |
| Check result | 22/22 |
| Builder script | `BreakoutWebGLBuilder.BuildWebGL` |
| Validation report | `UnityExamples/BreakoutTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` |
| Attempts | 2 |
| Issues encountered | Attempt 1: Physics2D module not in manifest (BallController.cs uses Collision2D/Rigidbody2D). Empty placeholder files in `Assets/Scripts/Game/` shadowed real sources in `Assets/Scripts/Breakout/`. Namespace `PartyGame.Breakout` caused cross-assembly issues. |
| Fixes applied | Added `com.unity.modules.physics2d: 1.0.0` to `Packages/manifest.json`. Removed empty `Assets/Scripts/Game/` directory. Stripped `PartyGame.Breakout` namespace from BreakoutGameManager.cs and PaddleController.cs. Sources from `game/breakout` branch (commit `cc0cae6`). Flat build output (nested `Build/` subdirectory). |

**Shared assets verified at `screen/Build_Breakout/`:**

| File | Size |
|---|---|
| Build/Build_Breakout.data | 3.9 MB |
| Build/Build_Breakout.framework.js | 705 KB |
| Build/Build_Breakout.loader.js | 38 KB |
| Build/Build_Breakout.wasm | 31.1 MB |
| index.html | 5.3 KB |
| partygame-template.js | 6.2 KB |

Note: Breakout uses nested `Build/` subdirectory (Unity default structure for multi-scene builds).

---

## 3. Critical Fixes Summary

### 3.1 Emscripten JSONDecodeError (All Games)

**Root cause:** Unity 6000.4.8f1 built-in Python 3.9 incompatible with Node.js v22 JSON output format.

**Fix:** `EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11`

**Execution mode:** Foreground only (`&&` not `&`). Background execution does not propagate environment variables to child Emscripten processes.

**Documentation:** `UnityExamples/UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md` §2

### 3.2 Arial.ttf → LegacyRuntime.ttf (Snake, 2048)

Unity 6 removed `Arial.ttf` as a built-in font. Must use `LegacyRuntime.ttf`.

Affected files:
- `UnityExamples/SnakeTemplateDemo/Assets/Editor/CreateSnakeScene.cs` (3 refs)
- `UnityExamples/_2048TemplateDemo/Assets/Editor/Create2048Scene.cs` (2 refs)

### 3.3 Physics2D Module (Breakout)

`BallController.cs` uses `Collision2D` and `Rigidbody2D`, requiring the Physics 2D built-in module.

**Fix:** Added `"com.unity.modules.physics2d": "1.0.0"` to `Packages/manifest.json`.

### 3.4 ProjectSettings GUID Conflict (Snake)

Copying JumpJump's full `ProjectSettings/` to Snake caused GUID mismatches — Bee backend exits with code 4 ("dag couldn't be loaded").

**Fix:** Only copy `ProjectVersion.txt` and `Packages/manifest.json`. Let Unity generate its own ProjectSettings on first import.

### 3.5 Namespace / Source Path (Breakout)

Original `game/breakout` branch code uses `namespace PartyGame.Breakout` with sources at `Assets/Scripts/Breakout/`. Created placeholder files at `Assets/Scripts/Game/` that shadowed real sources.

**Fix:** Stripped namespace declarations. Removed empty `Game/` directory. Referenced `Assets/Scripts/Breakout/` directly.

---

## 4. Build Output Directory Map

```
screen/
├── Build/                    ← JumpJump (baseline)
│   ├── Build.data            (3.8 MB)
│   ├── Build.framework.js    (372 KB)
│   ├── Build.loader.js       (19 KB)
│   ├── Build.wasm            (16 MB)
│   ├── index.html            (5.3 KB)
│   └── partygame-template.js (6.2 KB)
├── Build_Snake/              ← Snake
│   ├── Build_Snake.data      (3.8 MB)
│   ├── Build_Snake.framework.js (381 KB)
│   ├── Build_Snake.loader.js (27 KB)
│   ├── Build_Snake.wasm      (15.6 MB)
│   ├── index.html            (5.3 KB)
│   └── partygame-template.js (6.2 KB)
├── Build_2048/              ← 2048
│   ├── Build_2048.data       (3.8 MB)
│   ├── Build_2048.framework.js (380 KB)
│   ├── Build_2048.loader.js  (19 KB)
│   ├── Build_2048.wasm       (15.6 MB)
│   ├── index.html            (5.3 KB)
│   └── partygame-template.js (6.2 KB)
└── Build_Breakout/          ← Breakout
    ├── Build/
    │   ├── Build_Breakout.data (3.9 MB)
    │   ├── Build_Breakout.framework.js (705 KB)
    │   ├── Build_Breakout.loader.js (38 KB)
    │   └── Build_Breakout.wasm (31.1 MB)
    ├── index.html            (5.3 KB)
    └── partygame-template.js (6.2 KB)
```

---

## 5. Invariant Constraints

All four builds completed without violating any constraint:

| Constraint | Status |
|---|---|
| `server.js` (server protocol) | 0 bytes modified |
| Core protocol (`game_message.type` transparency) | Unchanged |
| `RELEASE_STATE.json` `current_phase` | Unchanged (`phase_3_canary_10_percent`) |
| Five Iron Laws | 5/5 intact |
| Git tags | None created |
| Build pipeline overwrites protocol | ❌ Not possible (build is offline) |

---

## 6. Recommendations

### 6.1 New Game Template Requirements

All new game templates **must** go through the Codex Build Pipeline before being marked as verified:

```
1. Agent generates game scripts → Assets/Scripts/Game/
2. Agent creates Editor builder → Assets/Editor/{Game}WebGLBuilder.cs
3. Agent creates scene creator → Assets/Editor/Create{Game}Scene.cs
4. Codex runs: EMSDK_PYTHON=python3.11 Unity -batchmode -executeMethod {Game}WebGLBuilder.BuildWebGL
5. QClaw runs: node scripts/check-unity-webgl-build.js screen/Build_{Game}
6. QClaw writes: WEBGL_BUILD_VALIDATION_REPORT.md
7. Gate: 22/22 check PASS
```

### 6.2 Verification Gate

A game template passes the build queue gate when:

- [x] Unity batchmode build succeeds
- [x] `check-unity-webgl-build.js` returns 22/22 PASS
- [x] `WEBGL_BUILD_VALIDATION_REPORT.md` generated
- [x] PartyGameBridge.jslib present (via template)
- [ ] Browser canvas render (Safari/Chrome) — **smoke test (not blocking)**

### 6.3 Browser Runtime Smoke Tests

Current status: build artifacts verified (automated). Browser runtime smoke tests recommended but NOT blocking build queue PASS:

| Game | Build | Browser Render |
|---|---|---|
| JumpJump | ✅ | ✅ Safari (Codex verified) |
| Snake | ✅ | ⬜ Pending |
| 2048 | ✅ | ⬜ Pending |
| Breakout | ✅ | ⬜ Pending |

### 6.4 Pipeline Expansion

The Codex Build Pipeline is ready for additional game templates. To add a new game:

1. Create `UnityExamples/{GameName}TemplateDemo/` from `_GameTemplateSkeleton`
2. Write `Assets/Scripts/Game/{GameName}GameManager.cs`
3. Write `Assets/Editor/Create{GameName}Scene.cs` + `{GameName}WebGLBuilder.cs`
4. Verify no `Arial.ttf` references (use `LegacyRuntime.ttf`)
5. Verify physics modules in `manifest.json` if needed
6. Run foreground build: `EMSDK_PYTHON=python3.11 Unity -batchmode -executeMethod {GameName}WebGLBuilder.BuildWebGL`
7. Run check: `node scripts/check-unity-webgl-build.js screen/Build_{GameName}`

---

**Report Generated:** 2026-05-23T16:53:00-07:00
**Author:** QClaw (openclaw-control-ui)
**Gate:** PASS
