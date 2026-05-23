# Codex Task: Multi-Game WebGL Build Pipeline

## Background

JumpJumpTemplateDemo WebGL Build → **PASS** (22/22 check, 5/5 iron laws).  
Now build the remaining game templates: Snake, 2048, Breakout.

## Environment

```
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11
UNITY=/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity
```

## Task 1: SnakeTemplateDemo Build

**Project:** `UnityExamples/SnakeTemplateDemo`  
**Builder:** `SnakeWebGLBuilder.BuildWebGL` (already created in `Assets/Editor/`)  
**Scene creator:** `CreateSnakeScene.CreateScene`

Steps:
1. Remove `Library/` if exists (fresh import)
2. Verify `Packages/manifest.json` exists (copied from JumpJump)
3. Verify `ProjectSettings/ProjectVersion.txt` exists
4. Verify `Assets/WebGLTemplates/PartyGameTemplate/` exists
5. Run:
```bash
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 \
/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity \
  -quit -batchmode -nographics \
  -acceptSoftwareTermsForThisRunOnly \
  -projectPath UnityExamples/SnakeTemplateDemo \
  -executeMethod SnakeWebGLBuilder.BuildWebGL \
  -logFile logs/codex/build-snake.log
```
6. Verify with `node scripts/check-unity-webgl-build.js`
7. Output → `screen/Build/` (will overwrite JumpJump build)

## Task 2: 2048 Game (Create from Skeleton)

**Skeleton:** `UnityExamples/_GameTemplateSkeleton`  
**Target:** `UnityExamples/_2048TemplateDemo`

Create:
- `Assets/Scripts/Game/Game2048Manager.cs` — 4x4 grid, swipe merge, score
- `Assets/Scripts/Game/GridCell.cs` — cell value + animation
- `Assets/Editor/Create2048Scene.cs` — MenuItem + scene creation
- `Assets/Editor/Game2048WebGLBuilder.cs` — BuildWebGL method

**2048 Game Rules:**
- 4×4 grid, two tiles spawn per move
- Swipe direction: up/down/left/right → tiles merge
- Score += merged value
- Win: 2048 tile created; Game Over: grid full, no moves
- Broadcast: `state.score_update` on merge, `state.game_over` on grid full

**Input type:** `input.direction` ("up"|"down"|"left"|"right")

Then build:
```bash
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 \
$UNITY -quit -batchmode -nographics \
  -acceptSoftwareTermsForThisRunOnly \
  -projectPath UnityExamples/_2048TemplateDemo \
  -executeMethod Game2048WebGLBuilder.BuildWebGL \
  -logFile logs/codex/build-2048.log
```

## Task 3: Breakout Build

Breakout source is on `game/breakout` branch (commit `cc0cae6`).
Checkout approach:
```bash
git checkout game/breakout -- .  # get files
```
Or create Breakout WebGL Builder in-place if project files exist.

## Acceptance Criteria

Each game:
1. Build succeeds (output in screen/Build/)
2. `check-unity-webgl-build.js` ≥ 20/22 (wasm/framework may differ by build config)
3. PartyGameBridge.jslib present
4. Five Iron Laws verified by QClaw after build

## Notes

- All builds use `EMSDK_PYTHON=python3.11`
- Build output goes to `screen/Build/` (each build overwrites previous)
- To preserve builds, output to `screen/Build_{GameName}/` instead (TODO)
- Do NOT modify server.js, protocol, or five iron laws
