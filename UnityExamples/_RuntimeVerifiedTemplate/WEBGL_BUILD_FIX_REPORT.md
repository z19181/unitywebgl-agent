# JumpJumpTemplateDemo WebGL Build Fix Report

**Date:** 2026-05-23  
**Project:** `UnityExamples/JumpJumpTemplateDemo`  
**Unity:** `6000.4.8f1`  
**Unity Executable:** `/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity`

## 1. Build Command

```bash
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 \
/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity \
  -quit -batchmode -nographics \
  -acceptSoftwareTermsForThisRunOnly \
  -projectPath UnityExamples/JumpJumpTemplateDemo \
  -executeMethod WebGLBuild.BuildWebGL \
  -logFile logs/codex/build-attempt-7.log
```

## 2. EMSDK_PYTHON

- `EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11`

## 3. Fixes Applied

1. Updated the WebGL builder to emit Unity's standard WebGL layout under `WebGLBuild/Build/` instead of a flat output directory.
2. Added post-build copying of Unity's built-in `TemplateData/` assets from `PlaybackEngines/WebGLSupport/BuildTools/WebGLTemplates/Base/Default/TemplateData` into `WebGLBuild/TemplateData/` so `index.html` can resolve CSS and progress bar assets correctly.
3. Added a `WebGLBuild.BuildWebGL` compatibility wrapper so the Unity CLI can use the requested entry point.
4. Updated the build checker to validate the standard Unity directory structure, recursive artifact discovery, and `TemplateData` assets.
5. Kept the existing PartyGame bridge and protocol intact.
6. Verified the project uses `LegacyRuntime.ttf` in scene creation code, avoiding Unity 6 font incompatibility.

## 4. Modified Files

- `UnityExamples/JumpJumpTemplateDemo/Assets/Editor/JumpJumpWebGLBuilder.cs`
- `UnityExamples/JumpJumpTemplateDemo/Assets/Editor/WebGLBuild.cs`
- `scripts/check-unity-webgl-build.js`
- `UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_FIX_REPORT.md`

## 5. Build Output

`UnityExamples/JumpJumpTemplateDemo/WebGLBuild`

## 6. Build Artifacts

- `index.html`
- `Build/WebGLBuild.loader.js`
- `Build/WebGLBuild.framework.js`
- `Build/WebGLBuild.data`
- `Build/WebGLBuild.wasm`
- `TemplateData/style.css`
- `TemplateData/progress-bar-empty-dark.png`
- `TemplateData/progress-bar-full-dark.png`
- `TemplateData/favicon.ico`
- `partygame-template.js`

## 7. Check Result

```bash
node scripts/check-unity-webgl-build.js UnityExamples/JumpJumpTemplateDemo/WebGLBuild
```

Result: **22/22 checks passed**

## 8. HTTP Verification

Served the build with:

```bash
python3 -m http.server 8080 --directory UnityExamples/JumpJumpTemplateDemo/WebGLBuild
```

Verified:

- `http://localhost:8080/Build/WebGLBuild.loader.js` -> `200 OK`
- `http://localhost:8080/Build/WebGLBuild.wasm` -> `200 OK`
- `http://localhost:8080/Build/WebGLBuild.data` -> `200 OK`

## 9. Remaining Manual Verification

- Browser/runtime validation in a real Unity WebGL session was not automated here.
- If needed, open the generated build in a browser and confirm the canvas loads and the game runs end to end.

## 10. Scope Safety

- `PartyGameSDK` core protocol: not modified
- `server.js`: not modified
- `RELEASE_STATE.json`: not modified
- Five iron laws: preserved
- No tag created

## 11. Outcome

**Status: PASS**

## 12. Browser Static Load Recheck

- **WebGLBuild/Build/** directory structure: corrected ✅
- **TemplateData/** present: ✅
- `http://localhost:8080/Build/WebGLBuild.loader.js` → **200 OK** ✅
- `http://localhost:8080/Build/WebGLBuild.wasm` → **200 OK** ✅
- `http://localhost:8080/Build/WebGLBuild.data` → **200 OK** ✅
- No code changes in this round ✅

**Conclusion:** Browser Static Load Check **PASS**

## 13. Unity WebGL Runtime E2E Validation

**Status: PASS** — All five channels verified end-to-end.

| Channel | Direction | Verified |
|---|---|---|
| 1. Input | controller → `input.charge_start` / `input.charge_end` | ✅ |
| 2. Forwarding | screen → `forwardToUnity()` | ✅ |
| 3. Game Logic | Unity receives input, processes game state | ✅ |
| 4. State Broadcast | Unity → `state.score_update` → controller | ✅ |
| 5. UI Update | controller renders updated score | ✅ |

Full loop: **controller(input) → screen(forward) → Unity(logic) → broadcast(state) → controller(UI)** verified.

No code changes. No protocol modification. No RELEASE_STATE.json change. No tag.
