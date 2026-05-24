# WebGL CurrentScene Build Static Validation Report

**Date:** 2026-05-24T07:39:00-07:00  
**Status:** ✅ PASS (26/26)

---

## 1. Build Identity

| Field | Value |
|---|---|
| **Project** | `UnityExamples/JumpJumpTemplateDemo/` |
| **Build Output** | `WebGLBuild_CurrentScene/` |
| **Scene** | CurrentScene (Plane + WebGLGroundPlane.mat) |
| **Validation Tool** | `check-unity-webgl-build.js` |

---

## 2. Network Static Load Check

| Asset | URL | HTTP |
|---|---|---|
| index.html | `http://localhost:8081/index.html` | 200 ✅ |
| loader.js | `http://localhost:8081/Build/WebGLBuild_CurrentScene.loader.js` | 200 ✅ |
| wasm | `http://localhost:8081/Build/WebGLBuild_CurrentScene.wasm` | 200 ✅ |
| data | `http://localhost:8081/Build/WebGLBuild_CurrentScene.data` | 200 ✅ |

All 4 core assets served successfully.

---

## 3. Build Check Results

| Tool | Result |
|---|---|
| `check-unity-webgl-build.js` | **26/26 PASS** ✅ |

---

## 4. Asset References Verified

| Reference | Found In | Status |
|---|---|---|
| `Build/WebGLBuild_CurrentScene.loader.js` | `index.html` | ✅ Correct |
| `TemplateData/style.css` | `index.html` | ✅ Correct |
| `partygame-template.js` | `index.html` | ✅ Correct |

---

## 5. Scene Material

| Object | Material | Status |
|---|---|---|
| Plane | `WebGLGroundPlane.mat` | ✅ Deployed |

Material complies with `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md`.

---

## 6. Browser Screenshot

- Headless browser screenshot attempted
- Result: unstable — **not counted as completed** ⚠️
- Replaced by static load validation (26/26 automated checks)

---

## 7. Invariant Constraints

| Constraint | Status |
|---|---|
| `server.js` modified | ❌ No |
| Core protocol changed | ❌ No |
| `RELEASE_STATE.json` modified | ❌ No |
| Five Iron Laws violated | ❌ No |
| Git tags created | ❌ No |

---

## 8. Final Status

**CurrentScene WebGL Build Static Validation: PASS** ✅

26/26 automated checks passed. All 4 assets served correctly from localhost:8081. Material policy compliant.
