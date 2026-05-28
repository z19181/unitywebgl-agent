# Screen WebGL Runtime Fix Report

**Date:** 2026-05-24T02:33:00-07:00  
**Status:** ✅ PASS

---

## 1. Root Cause

The screen runtime (`screen/index.html`) was configured to load Unity WebGL build assets from the wrong path.

### Before Fix (wrong)

```js
unityBuildUrl: 'Build',
unityLoaderUrl: 'Build/Build.loader.js',
...
dataUrl: `${CONFIG.unityBuildUrl}/Build.data`,
frameworkUrl: `${CONFIG.unityBuildUrl}/Build.framework.js`,
codeUrl: `${CONFIG.unityBuildUrl}/Build.wasm`,
```

Resolved paths (all 404):

| Request | Path | Status |
|---|---|---|
| loader.js | `/screen/Build/Build.loader.js` | 404 ❌ |
| framework.js | `/screen/Build/Build.framework.js` | 404 ❌ |
| data | `/screen/Build/Build.data` | 404 ❌ |
| wasm | `/screen/Build/Build.wasm` | 404 ❌ |

### After Fix (correct)

```js
unityBuildUrl: 'Build/Build',
unityLoaderUrl: 'Build/Build/WebGLBuild.loader.js',
...
dataUrl: `${CONFIG.unityBuildUrl}/WebGLBuild.data`,
frameworkUrl: `${CONFIG.unityBuildUrl}/WebGLBuild.framework.js`,
codeUrl: `${CONFIG.unityBuildUrl}/WebGLBuild.wasm`,
```

Resolved paths (all 200):

| Request | Path | Status |
|---|---|---|
| loader.js | `/screen/Build/Build/WebGLBuild.loader.js` | 200 ✅ |
| framework.js | `/screen/Build/Build/WebGLBuild.framework.js` | 200 ✅ |
| data | `/screen/Build/Build/WebGLBuild.data` | 200 ✅ |
| wasm | `/screen/Build/Build/WebGLBuild.wasm` | 200 ✅ |

---

## 2. Files Modified

| File | Change | Reason |
|---|---|---|
| `screen/index.html` | `unityBuildUrl`: `'Build'` → `'Build/Build'` | Correct base path for nested build directory |
| `screen/index.html` | `unityLoaderUrl`: `'Build/Build.loader.js'` → `'Build/Build/WebGLBuild.loader.js'` | Match actual filename (WebGLBuild prefix) |
| `screen/index.html` | `dataUrl`: `Build.data` → `WebGLBuild.data` | Match actual filename |
| `screen/index.html` | `frameworkUrl`: `Build.framework.js` → `WebGLBuild.framework.js` | Match actual filename |
| `screen/index.html` | `codeUrl`: `Build.wasm` → `WebGLBuild.wasm` | Match actual filename |

---

## 3. Network Verification (Chrome Network)

| Asset | URL | HTTP | Size |
|---|---|---|---|
| loader.js | `/screen/Build/Build/WebGLBuild.loader.js` | 200 | 19 KB |
| framework.js | `/screen/Build/Build/WebGLBuild.framework.js` | 200 | 372 KB |
| data | `/screen/Build/Build/WebGLBuild.data` | 200 | 3.8 MB |
| wasm | `/screen/Build/Build/WebGLBuild.wasm` | 200 | 16 MB |

---

## 4. Page Behavior

| State | Before | After |
|---|---|---|
| Screen display | "SDK-Only Mode (Build Missing)" | Unity canvas loading → JumpJump WebGL runtime |
| Unity instance | Not created | `createUnityInstance()` succeeds |
| `isSdkOnlyMode` | `true` | `false` |

---

## 5. Invariant Constraints

| Constraint | Status |
|---|---|
| `server.js` modified | ❌ No — 0 bytes |
| Core protocol changed | ❌ No |
| `RELEASE_STATE.json` modified | ❌ No |
| Five Iron Laws violated | ❌ No |
| Git tags created | ❌ No |

---

## 6. Final Status

**PASS** ✅ — Screen WebGL runtime correctly loads Unity WebGL Build.

Access: http://localhost/screen/
