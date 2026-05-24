# WEBGL_RUNTIME_PIPELINE — v1.0.1-governance

**Version:** v1.0.1-governance  
**Golden Template:** `UnityExamples/_RuntimeVerifiedTemplate/`  
**Material Policy:** `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md`

---

## A. Runtime Pipeline

```
Unity batchmode Build
  → check-unity-webgl-build.js (26 checks)
  → Browser Static Load Check
  → DOM Integrity Check
  → Runtime Visual Check
  → Runtime E2E Validation
  → PASS
```

Each gate is blocking — failure at any gate halts the pipeline.

---

## B. Runtime Gate Definitions

### Gate 1: check-unity-webgl-build.js

**Tool:** `scripts/check-unity-webgl-build.js`  
**Scope:** 26 automated checks on build output directory  
**Criteria:** All 26 checks pass (exit code 0)  
**Failure:** Any check fails → build rejected. Do not proceed.

### Gate 2: Browser Static Load

**Scope:** Verify all build assets are served at correct URLs via HTTP  
**Criteria:** `index.html`, `loader.js`, `framework.js`, `wasm`, `data`, `style.css`, `favicon.ico`, `partygame-template.js` all return HTTP 200  
**Failure:** Any asset 404 → build cannot load. Do not proceed.

### Gate 3: DOM Integrity

**Scope:** Verify the served `index.html` contains correct references  
**Criteria:**
- `#unity-canvas` element present
- `WebGLBuild_*.loader.js` script reference present
- `partygame-template.js` script reference present
- `<!DOCTYPE html>` valid
**Failure:** Missing DOM elements → canvas won't render. Do not proceed.

### Gate 4: Runtime Visual

**Scope:** Browser renders Unity canvas and scene is visible  
**Criteria:**
- Unity loading bar visible in browser
- Progress reaches 100%
- Canvas renders — NOT black screen
- Scene objects visible (e.g., WebGLGroundPlane)
- 0 shader compile errors in console
**Failure:** Black screen, missing objects, or shader errors → build broken. Do not proceed.  
**Minimum browsers:** Chrome (desktop), Safari (mobile), Chrome (mobile) — at least one smoke test

### Gate 5: Runtime E2E

**Scope:** Full 5-channel runtime loop verified  
**Criteria:** All 5 channels operational:
1. controller sends `input` event
2. `PartyGameBridge.jslib` delivers to Unity
3. Unity processes game logic
4. Unity broadcasts `state_update` to controller
5. controller renders updated UI

**Failure:** Any channel broken → game not playable. BLOCKING.

---

## C. Runtime E2E Definition

```
controller (mobile browser)
  → WebSocket game_message (input.*)
  → server (playerIndex inject)
  → screen (forwardToUnity)
  → PartyGameBridge.jslib (SendMessage)
  → Unity Runtime (game logic)
  → PartyGameBridge.jslib (state callback)
  → screen (broadcast)
  → server (relay)
  → controller (state_update → UI render)
```

### Channel Verification

| Channel | From | To | Protocol | Verify |
|---|---|---|---|---|
| 1. Input | controller | PartyGameBridge | WS `game_message` | Console log `[Controller] sent` |
| 2. Forward | screen | Unity | `forwardToUnity()` | Screen log `[Screen] → Unity` |
| 3. Logic | Unity | Unity | C# game code | Unity `Debug.Log` |
| 4. Broadcast | Unity | controller | `state_update` WS | Console log `[Controller] state_update` |
| 5. UI | controller | User | DOM update | Visual: score text changes |

---

## D. WebGL-Safe Material Rules

**Reference:** `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md`

Summary for pipeline:
- **Allowed:** URP Lit, URP Simple Lit, Unlit/Texture, Unlit/Color, Sprite/Default, Mobile/Diffuse
- **Prohibited:** HDRP, unverified ShaderGraph, unverified Amplify Shader, GrabPass, Compute Shader
- **Texture max:** 1024×1024
- **AI assets:** `Art/Generated/` → review → `WebGLSafe/`
- **Materials go in:** `Assets/Materials/WebGLSafe/`
- **Textures go in:** `Assets/Textures/WebGLSafe/`
- **Shaders go in:** `Assets/Shaders/WebGLSafe/`

Pipeline gate impact: Gate 4 (Runtime Visual) is where material failures manifest as black screens or missing objects.

---

## E. Browser Verification Rules

### Minimum Verification Matrix

| Browser | Platform | Gate 4 | Gate 5 |
|---|---|---|---|
| Chrome | Desktop (macOS/Windows) | ✅ Required | ✅ Required |
| Safari | Desktop (macOS) | ✅ Required | Recommended |
| Mobile Safari | iOS | ✅ Required | Recommended |
| Chrome | Android | Recommended | Recommended |

### Console Error Zero-Tolerance

Any of the following in browser console during Gates 4-5 = **FAIL**:
- `Shader not supported`
- `failed to compile shader`
- `GL_INVALID_OPERATION`
- `WebGL: INVALID_VALUE`
- `MissingReferenceException`
- `NullReferenceException` (in Unity runtime context)

### Network Error Zero-Tolerance

Any 404 or 5xx on build assets during Gate 2 = **FAIL**.

---

**Pipeline Version:** v1.1.0  
**Effective Date:** 2026-05-24  
**Golden Template:** `UnityExamples/_RuntimeVerifiedTemplate/`

---

## F. Runtime Automation (v1.1.0)

### Playwright Runtime Tests

**Directory:** `tests/runtime/`

| File | Purpose |
|---|---|
| `playwright.config.ts` | Chromium config, 120s timeout, SwiftShader |
| `runtime-visual.spec.ts` | Gate 4: canvas render, hooks, console, DOM |
| `runtime-e2e.spec.ts` | Gate 5: 5-channel loop, state broadcast, playerIndex |
| `controller-input.spec.ts` | Input types: charge_start/end, tap, move |
| `helpers/websocket-helper.ts` | WS message capture + assertion |
| `helpers/screenshot-helper.ts` | Canvas screenshot + black detection |
| `helpers/runtime-assertions.ts` | assertRuntimeReady, assertCanvasNotBlack, etc. |

### Unity Runtime JS Hooks

| Hook | Purpose | Scope |
|---|---|---|
| `window.__PARTYGAME_RUNTIME_READY__` | `true` when Unity instance initialized | Debug / automation |
| `window.__PARTYGAME_LAST_STATE__` | Last `state_update` payload | Debug / automation |
| `window.__PARTYGAME_LAST_INPUT__` | Last `game_message` received by Unity | Debug / automation |

These hooks do NOT modify the PartyGameSDK protocol, server.js, or Five Iron Laws.
They are read-only debug hooks set via `Application.ExternalEval()` only when `UNITY_WEBGL` is defined.

### CI Pipeline

**Workflow:** `.github/workflows/runtime-e2e.yml`

```
Unity batchmode Build → check-unity-webgl-build.js →
nginx serve → Playwright runtime tests → artifact upload
```

### Reference Docs

- `docs/RUNTIME_FAILURE_MATRIX.md` — 8 failure categories with detection + recovery
- `docs/RUNTIME_ARTIFACT_POLICY.md` — screenshot, log, trace retention rules
- `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md` — original planning document

---
