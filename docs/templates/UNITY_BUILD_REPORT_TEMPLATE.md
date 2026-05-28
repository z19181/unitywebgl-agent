# UNITY_BUILD_REPORT_TEMPLATE.md

> **Purpose:** Document a Unity WebGL build for the PartyGameSDK pipeline.
> **Agent:** Codex Build Agent → QA Agent
> **Command:** `/build-webgl` → `/check-webgl-build`

---

## Build Identity

| Field | Value |
|---|---|
| **Game Name** | `{GameName}` |
| **Builder Script** | `Assets/Editor/{GameName}WebGLBuilder.cs` |
| **Build Date** | `{YYYY-MM-DD}` |
| **Unity Version** | `6000.4.8f1` |
| **Build Agent** | Codex Build Agent |

---

## Build Command

```bash
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 \
/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity \
  -batchmode \
  -quit \
  -projectPath "{project-path}" \
  -executeMethod {GameName}WebGLBuilder.BuildWebGL \
  -logFile /tmp/unity-build-{gamename}.log
```

---

## Build Attempts

| Attempt | Result | Issue | Fix |
|---|---|---|---|
| 1 | `{PASS / FAIL}` | `{error message}` | `{fix applied}` |
| 2 | `{PASS / FAIL}` | `{error message}` | `{fix applied}` |
| N | `{PASS}` | — | — |

---

## Build Output

| File | Size | Status |
|---|---|---|
| `Build_{GameName}.loader.js` | `{N} KB` | ✅ |
| `Build_{GameName}.framework.js` | `{N} KB` | ✅ |
| `Build_{GameName}.data` | `{N} MB` | ✅ |
| `Build_{GameName}.wasm` | `{N} MB` | ✅ |
| `index.html` | `{N} KB` | ✅ |
| `partygame-template.js` | `{N} KB` | ✅ |

---

## Validation Check

| Tool | Result |
|---|---|
| `check-unity-webgl-build.js` | `{N}/22 PASS` |
| `hooks/validate-webgl-build-output.sh` | `{N}/22 PASS` |

---

## Critical Fixes Applied

### EMSDK_PYTHON
```
Fix: Set EMSDK_PYTHON=/path/to/python3.11
Reason: Unity 6000 built-in Python 3.9 incompatible with Node.js v22
```

### Font Compatibility
```
Fix: Arial.ttf → LegacyRuntime.ttf in Create{GameName}Scene.cs
Reason: Unity 6 removed Arial.ttf as built-in font
```

### Physics Module
```
Fix: Added com.unity.modules.physics2d to Packages/manifest.json
Reason: {GameName} uses Collision2D/Rigidbody2D
```

---

## Known Issues

`{List any known issues or warnings}`

---

## Gate Decision

- [ ] All 22 checks PASS
- [ ] `.wasm` file within size budget (≤ 50 MB)
- [ ] `PartyGameBridge.jslib` referenced and unmodified
- [ ] Build log reviewed for warnings

**Verdict:** `{PASS / FAIL}`
