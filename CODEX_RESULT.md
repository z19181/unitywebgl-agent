# Codex Result: Multi-Game WebGL Build Queue

**Status: PASS**  
**Date: 2026-05-23 11:40 PDT**  
**Executor: QClaw (foreground build)**

## Environment

| Variable | Value |
|---|---|
| EMSDK_PYTHON | /Users/applemima1111/.local/bin/python3.11 |
| Unity | 6000.4.8f1 (Apple M2 arm64) |
| Build Mode | Foreground batchmode (required for EMSDK_PYTHON propagation) |

## Critical Fix

**Backgrounded builds (`&`) fail** — EMSDK_PYTHON does not propagate to child Emscripten processes.  
**Foreground builds (`&&`) succeed** — env var propagates correctly.

## Per-Game Results

| Game | Build | Check | Output Dir | Attempts |
|---|---|---|---|---|
| 🐍 Snake | ✅ PASS | 22/22 | screen/Build_Snake | 6 (Arial.ttf + bee_backend) |
| 🎲 2048 | ✅ PASS | 22/22 | screen/Build_2048 | 2 (Arial.ttf) |
| 🧱 Breakout | ✅ PASS | 22/22 | screen/Build_Breakout | 2 (Physics2D + namespace) |

## Fixes Applied

| Game | Issue | Fix |
|---|---|---|
| Snake | Arial.ttf in CreateSnakeScene.cs | sed → LegacyRuntime.ttf |
| Snake | bee_backend ExitCode 4 (cold cache) | Reuse Library between attempts + foreground |
| 2048 | Arial.ttf in Create2048Scene.cs | sed → LegacyRuntime.ttf |
| Breakout | Physics2D missing from manifest | Added com.unity.modules.physics2d |
| Breakout | Namespace PartyGame.Breakout | Stripped to top-level classes |
| Breakout | Empty files in Assets/Scripts/Game/ | Removed, used Assets/Scripts/Breakout/ |

## Build Artifact Summary

| Game | .data | .framework.js | .loader.js | .wasm |
|---|---|---|---|---|
| Snake | 3.8 MB | 381 KB | 27 KB | 15.6 MB |
| 2048 | 3.8 MB | 380 KB | 19 KB | 15.5 MB |
| Breakout | 3.9 MB | 705 KB | 38 KB | 31.1 MB |

## Constraints Verification

| Constraint | Status |
|---|---|
| server.js modified | ❌ 0 bytes |
| current_phase changed | ❌ No |
| Five Iron Laws broken | ❌ No |
| Protocol changed | ❌ No |
| Tag created | ❌ No |

## Issues Remaining

- Breakout output in `Build/` subdirectory (different structure)
- All games need real-link WebSocket + browser canvas verification
- PartyGameBridge.jslib present via WebGL template (not in build output)
