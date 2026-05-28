# Runtime Verified Template Report

**Date:** 2026-05-24T07:52:00-07:00  
**Branch:** `platform/v0.4.2`  
**Commit:** `264c45c` (CurrentScene ALL GATES CLEAR)  
**Status:** ✅ PASS

---

## 1. Golden Template

| Attribute | Value |
|---|---|
| **Path** | `UnityExamples/_RuntimeVerifiedTemplate/` |
| **Source** | `UnityExamples/JumpJumpTemplateDemo/` |
| **Frozen at** | CurrentScene ALL GATES CLEAR |
| **Size** | 115 MB |
| **Contents** | Assets/ (WebGL-safe), ProjectSettings/, Packages/, UserSettings/, verified build output |
| **Excluded** | Library/ (2.6GB), Temp/, Logs/, AmplifyShaderEditor/, build cache |

### Verified Assets Preserved

```
_RuntimeVerifiedTemplate/
├── Assets/
│   ├── Plugins/WebGL/PartyGameBridge.jslib       ← E2E bridge
│   ├── Scenes/                                     ← Verified scene
│   ├── WebGLSafeFallback/                          ← WebGL-safe materials
│   ├── WebGLTemplates/PartyGameTemplate/           ← Build template
│   ├── WebGLURP/                                   ← URP config
│   ├── Scripts/                                    ← Game logic
│   └── Editor/                                     ← Build scripts
├── ProjectSettings/                                ← Unity settings
├── Packages/                                       ← Package manifest
├── WebGLBuild_CurrentScene/                        ← Verified build
│   ├── index.html
│   ├── partygame-template.js
│   ├── TemplateData/
│   └── Build/
│       ├── WebGLBuild_CurrentScene.loader.js
│       ├── WebGLBuild_CurrentScene.framework.js
│       ├── WebGLBuild_CurrentScene.wasm (28 MB)
│       └── WebGLBuild_CurrentScene.data (85 MB)
└── *.md (5 validation reports)
```

---

## 2. Runtime Pipeline

```
Unity batchmode Build
  → check-unity-webgl-build.js (26 checks)
  → Browser Static Load (8 assets → 200)
  → DOM Integrity (canvas, loader, partygame refs)
  → Runtime Visual (canvas renders, no black screen)
  → Runtime E2E (5-channel loop)
  → ALL GATES CLEAR
```

**Reference:** `UnityExamples/WEBGL_RUNTIME_PIPELINE.md`

---

## 3. Verified Gates

| Gate | Tool / Method | Status |
|---|---|---|
| `check-unity-webgl-build.js` | 26 automated checks | 26/26 ✅ |
| Browser Static Load | curl HTTP verification | 8/8 ✅ |
| DOM Integrity | HTML structure inspection | PASS ✅ |
| Runtime Visual | Mobile Safari manual smoke test | MANUAL_VERIFIED ✅ |
| Runtime E2E | 5-channel loop: controller→bridge→Unity→broadcast→UI | PASS ✅ |

---

## 4. Runtime E2E Status

5-channel loop verified:

```
controller (input)
  → PartyGameBridge.jslib (SendMessage)
  → Unity Runtime (game logic)
  → broadcast/state_update
  → controller UI (render)
```

All channels operational. Confirmed on mobile device via `http://192.168.0.31:8081/`.

---

## 5. Material Compliance

All materials comply with `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md`.

| Material | Path | WebGL-safe? |
|---|---|---|
| WebGLGroundPlane | `Assets/WebGLSafeFallback/` | ✅ |
| WebGLSafeFallback | `Assets/WebGLSafeFallback/` | ✅ |

No HDRP, Amplify Shader, or prohibited materials in template.

---

## 6. Files Created / Updated

### New Files (4)

| File | Purpose |
|---|---|
| `UnityExamples/_RuntimeVerifiedTemplate/` | Frozen golden template |
| `UnityExamples/WEBGL_RUNTIME_PIPELINE.md` | 5-gate pipeline definition |
| `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md` | Playwright + CI automation plan |
| `UnityExamples/RUNTIME_VERIFIED_TEMPLATE_REPORT.md` | This report |

### Updated Files (3)

| File | Section | Change |
|---|---|---|
| `PARTY_GAME_SDK_FINAL_HANDOFF.md` | §11 | Runtime Verified Template + gate matrix + SOP |
| `UnityExamples/GAME_TEMPLATE_FACTORY.md` | §10.6 | Golden Template reference + new game SOP |
| `docs/WORKFLOW_COMMANDS.md` | `/runtime-gate` | New workflow command with 4 gates |

---

## 7. Invariant Constraints

| Constraint | Status |
|---|---|
| `server.js` modified | ❌ No — 0 bytes |
| Core protocol changed | ❌ No |
| `RELEASE_STATE.json` modified | ❌ No |
| Five Iron Laws violated | ❌ No |
| Git tags created | ❌ No |

---

## 8. Final Status

**PASS** ✅

Runtime Verified Golden Template frozen and delivered. All 5 pipeline gates verified. Material policy enforced. Automation plan documented for v1.1.0.

**Next step:** v1.1.0 — implement Playwright automation + CI integration per `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md`.
