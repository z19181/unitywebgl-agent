# Runtime Failure Matrix — v1.1.0

**Version:** v1.1.0  
**Scope:** All WebGL runtime gate failures  
**Usage:** Triage guide for automated /runtime-gate failures

---

## Failure Categories

### 1. Loader Fail

| Attribute | Value |
|---|---|
| **Symptom** | Blank page, no Unity canvas, loading bar never appears |
| **Gate** | Gate 2 (Browser Static Load) |
| **Probable Cause** | `loader.js` 404, wrong path, or CDN unreachable |
| **Detection** | `curl -I <loader-url>` returns non-200; Playwright: `page.waitForSelector('#unity-canvas')` timeout |
| **Recovery** | Check `index.html` `loaderUrl` path matches actual file location. Verify nginx/CDN serving. |

### 2. Wasm Fail

| Attribute | Value |
|---|---|
| **Symptom** | Loading bar stuck, browser tab freezes, console: `failed to asynchronously prepare wasm` |
| **Gate** | Gate 2 (Static Load) or Gate 4 (Runtime Visual) |
| **Probable Cause** | `.wasm` file 404, corrupted, or too large for browser (mobile ~50MB limit) |
| **Detection** | `curl -I <wasm-url>` returns non-200; Network panel shows stalled wasm fetch |
| **Recovery** | Verify build output includes `.wasm`. Enable Brotli compression. Check build size < 50MB. |

### 3. Missing Shader

| Attribute | Value |
|---|---|
| **Symptom** | Pink/magenta objects in scene |
| **Gate** | Gate 4 (Runtime Visual) |
| **Probable Cause** | Shader not included in WebGL build, or referenced shader is HDRP/incompatible |
| **Detection** | Visual: pink objects. Console: no specific error in Unity 6, but material appears as fallback pink. |
| **Recovery** | Replace material with WebGL-safe shader (`Unlit/Color`, `Unlit/Texture`, `URP Simple Lit`). Add to `Always Included Shaders` in Graphics Settings. |

### 4. Black Screen

| Attribute | Value |
|---|---|
| **Symptom** | Unity canvas renders, but completely black. No game objects visible. |
| **Gate** | Gate 4 (Runtime Visual) |
| **Probable Cause** | Camera not rendering, scene empty, HDRP material used, or shader compile fails silently |
| **Detection** | `assertCanvasNotBlack()` fails. Canvas pixel sampling returns near-zero brightness. |
| **Recovery** | 1) Check scene has camera + objects. 2) Replace all materials with WebGL-safe shaders. 3) Check browser console for shader errors. 4) Verify `WebGLGroundPlane.mat` exists. |

### 5. WebSocket Fail

| Attribute | Value |
|---|---|
| **Symptom** | `[Controller] disconnected` in console, no input reaches Unity |
| **Gate** | Gate 5 (Runtime E2E) |
| **Probable Cause** | Server not running, wrong WS URL, SSL mismatch (ws vs wss), firewall |
| **Detection** | Playwright: WebSocket connection error. Browser Console: `WebSocket connection failed`. |
| **Recovery** | 1) Verify `docker compose up -d`. 2) Check `window.location.protocol` auto-detect. 3) Verify nginx proxy passes WS correctly. 4) Check firewall/port. |

### 6. Controller Desync

| Attribute | Value |
|---|---|
| **Symptom** | Controller sends input, but state never updates on UI |
| **Gate** | Gate 5 (Runtime E2E) |
| **Probable Cause** | `state_update` handler missing in controller, playerIndex mismatch, or broadcast not forwarded |
| **Detection** | `assertLastState(page, 'score_update')` timeout. Controller DOM unchanged after input. |
| **Recovery** | 1) Verify controller handles `state_update` message type. 2) Check `forwardToUnity()` in screen. 3) Verify server relays `game_message` with correct `playerIndex`. |

### 7. Runtime Timeout

| Attribute | Value |
|---|---|
| **Symptom** | `assertRuntimeReady()` or `assertUnityLoaded()` timeout |
| **Gate** | Gate 4 (Runtime Visual) |
| **Probable Cause** | Build too large (slow load), JavaScript error in loader, infinite loop in Unity startup |
| **Detection** | Playwright: test times out at 60-120s. Browser: loading bar stuck at < 100%. |
| **Recovery** | 1) Check build output size (wasm + data > 200MB = too large). 2) Enable Brotli compression. 3) Check console for JS errors. 4) Strip unused engine features in Player Settings. |

### 8. State Broadcast Fail

| Attribute | Value |
|---|---|
| **Symptom** | Unity processes input but state never reaches controller |
| **Gate** | Gate 5 (Runtime E2E) |
| **Probable Cause** | `PartyGameBridge` state callback not wired, server not broadcasting, or wrong message type |
| **Detection** | `__PARTYGAME_LAST_STATE__` never updated after input sent. |
| **Recovery** | 1) Verify `PartyGameBridge.jslib` calls `SendMessage("PartyGameBridge", "OnStateUpdate", ...)`. 2) Check server relay logic. 3) Verify controller WebSocket connection alive. |

---

## Detection Summary

| Failure | Gate | Auto-Detect? | Manual Fallback |
|---|---|---|---|
| Loader fail | 2 | ✅ curl 404 | Open URL in browser |
| Wasm fail | 2/4 | ✅ curl 404 + Playwright timeout | Network panel |
| Missing shader | 4 | ⚠️ Visual only | Look for pink objects |
| Black screen | 4 | ✅ `assertCanvasNotBlack()` | Visual inspection |
| WebSocket fail | 5 | ✅ Connection error | Console log |
| Controller desync | 5 | ✅ `assertLastState()` timeout | Check controller DOM |
| Runtime timeout | 4 | ✅ Test timeout | Check loading bar |
| State broadcast fail | 5 | ✅ Hook never fires | WS message trace |

---

**Document Version:** v1.1.0  
**Effective Date:** 2026-05-24
