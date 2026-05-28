# WebGL Runtime Automation Plan — v1.0.1-governance

**Version:** v1.0.1-governance  
**Status:** PLANNING (not yet implemented)  
**Target:** v1.1.0  

---

## A. Playwright Runtime Automation

### Goal

Automate the full Runtime E2E pipeline (Gates 2-5) using Playwright, eliminating manual browser verification.

### Test Flow

```
1. Launch screen page (Chrome headless)
   → Navigate to http://localhost/screen/Build/
   → Wait for #unity-canvas
   → Verify Unity loading complete (progress bar hidden)

2. Launch controller page (Chrome headless, separate context)
   → Navigate to http://localhost/controller
   → Wait for WebSocket connection

3. Join room
   → Screen creates room → captures roomId
   → Controller sends create_room → joins

4. Send input
   → Controller sends game_message { type: "input.charge_start" }
   → Verify server relays (metrics check)

5. Check broadcast
   → Unity processes → sends state_update
   → Verify controller receives state_update
   → Verify controller DOM updated

6. Screenshot canvas
   → Screenshot #unity-canvas element
   → Compare with baseline (not black, has expected content)

7. Console error check
   → Collect all console errors
   → Assert 0 errors of type: shader, WebGL, NullReference, MissingReference
```

### Playwright Script Structure

```javascript
// tests/runtime-e2e.spec.js
const { test, expect } = require('@playwright/test');

test('Runtime E2E pipeline', async ({ browser }) => {
  // Gate 2: Static Load
  const screenPage = await browser.newPage();
  await screenPage.goto('http://localhost:8081/index.html');
  await screenPage.waitForSelector('#unity-canvas', { timeout: 30000 });
  
  // Gate 3: DOM Integrity
  expect(await screenPage.$('#unity-canvas')).toBeTruthy();
  expect(await screenPage.$('script[src*="partygame-template.js"]')).toBeTruthy();
  
  // Gate 4: Runtime Visual
  await screenPage.waitForFunction(() => {
    const bar = document.querySelector('#unity-loading-bar');
    return bar && bar.style.display === 'none';
  }, { timeout: 60000 });
  
  // Gate 5: Runtime E2E
  const controllerPage = await browser.newPage();
  // ... controller interaction ...
});
```

---

## B. Unity JS Hook

### Recommended Global Hooks

Unity C# script should set these on `window`:

```javascript
// Set after Unity instance is fully initialized
window.__PARTYGAME_RUNTIME_READY__ = true;

// Updated every time game state changes
window.__PARTYGAME_LAST_STATE__ = {
  timestamp: Date.now(),
  type: "score_update",
  data: { ... }
};
```

### Implementation (C# side)

```csharp
// In JumpJumpGameManager.cs (or equivalent)
void Start() {
    // On runtime ready
    #if UNITY_WEBGL && !UNITY_EDITOR
    Application.ExternalEval("window.__PARTYGAME_RUNTIME_READY__ = true;");
    #endif
}

void BroadcastState(string jsonState) {
    // Send to PartyGameBridge
    PartyGameBridge.SendToController("state_update", jsonState);
    
    #if UNITY_WEBGL && !UNITY_EDITOR
    Application.ExternalEval(
        $"window.__PARTYGAME_LAST_STATE__ = {{ timestamp: Date.now(), data: {jsonState} }};"
    );
    #endif
}
```

### Usage in Playwright Tests

```javascript
// Wait for runtime readiness
await screenPage.waitForFunction(() => window.__PARTYGAME_RUNTIME_READY__);

// Assert state after input
await controllerPage.click('#charge-button');
await screenPage.waitForFunction(() => {
  const s = window.__PARTYGAME_LAST_STATE__;
  return s && s.type === 'score_update';
});
```

---

## C. CI Integration

### Workflow 1: unity-webgl-build.yml

```yaml
# .github/workflows/unity-webgl-build.yml
name: Unity WebGL Build

on:
  push:
    paths:
      - 'UnityExamples/**'
      - '!UnityExamples/**/*.md'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: game-ci/unity-builder@v4
        with:
          targetPlatform: WebGL
          projectPath: UnityExamples/_GameTemplate
          buildMethod: GameTemplateWebGLBuilder.BuildWebGL
      - name: check-unity-webgl-build.js
        run: node scripts/check-unity-webgl-build.js UnityExamples/_GameTemplate/WebGLBuild
      - uses: actions/upload-artifact@v4
        with:
          name: webgl-build
          path: UnityExamples/_GameTemplate/WebGLBuild
```

### Workflow 2: runtime-e2e.yml

```yaml
# .github/workflows/runtime-e2e.yml
name: WebGL Runtime E2E

on:
  workflow_run:
    workflows: ["Unity WebGL Build"]
    types: [completed]

jobs:
  e2e:
    runs-on: ubuntu-latest
    services:
      nginx:
        image: nginx:alpine
        ports: [8081:80]
        volumes:
          - ${{ github.workspace }}/webgl-build:/usr/share/nginx/html:ro
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: webgl-build
          path: webgl-build
      - name: Static Load Check
        run: |
          curl -sf http://localhost:8081/index.html
          curl -sf http://localhost:8081/Build/*.loader.js
          curl -sf http://localhost:8081/Build/*.wasm
          curl -sf http://localhost:8081/Build/*.data
      - name: Playwright E2E
        run: npx playwright test tests/runtime-e2e.spec.js
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: e2e-screenshots
          path: test-results/
```

---

## D. Runtime Failure Matrix

| Failure | Symptom | Gate | Root Cause | Fix |
|---|---|---|---|---|
| Loader fail | Blank page, no Unity canvas | Gate 2 | loader.js 404 or wrong path | Fix `loaderUrl` in `index.html` |
| Wasm fail | Loading bar stuck, console error | Gate 2 | `.wasm` 404 or corrupted | Verify build output, check path |
| Black screen | Canvas renders all black | Gate 4 | Shader incompatible (HDRP, unverified) | Replace with WebGL-safe shader |
| Missing shader | Pink/magenta objects | Gate 4 | Shader not included in build | Use Always Included Shaders or URP |
| WebSocket fail | `[Controller] disconnected` | Gate 5 | Server not running or wrong URL | Check server, verify protocol auto-detect |
| Controller desync | State not updating on controller | Gate 5 | `broadcast` handler missing or playerIndex mismatch | Fix controller `state_update` handler |
| NullReference | Console error, game stuck | Gate 4 | Missing GameObject or script reference | Fix scene setup, verify Prefabs |
| Texture too large | Slow load, mobile crash | Gate 4 | Texture > 1024×1024 | Resize to 512 or 1024 |
| Shader compile error | Console: `failed to compile` | Gate 4 | Custom shader not WebGL-compatible | Use built-in shader or validated custom |
| Memory overflow | Tab crash on mobile | Gate 4 | Build too large (wasm > 50MB) | Strip engine code, compress assets |

---

## E. Implementation Roadmap

| Phase | Deliverable | Target |
|---|---|---|
| v1.0.1 | Pipeline defined (this doc) | ✅ Done |
| v1.1.0 | Playwright test script + Unity hooks | Planned |
| v1.1.0 | GitHub Actions CI (build + e2e) | Planned |
| v1.2.0 | Baseline screenshot comparison | Backlog |
| v1.2.0 | Multi-browser matrix (Chrome + Safari + Mobile) | Backlog |

---

**Document Version:** v1.0.1-governance  
**Effective Date:** 2026-05-24  
**Implementation Target:** v1.1.0
