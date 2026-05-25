# STASH VALIDATION REPORT

**Branch:** temp/stash-validation (from platform/v0.4.2 @ 72f71f7)
**Stash:** stash@{0} (created before rebase)
**Date:** 2026-05-25 06:17 PDT
**Status:** ✅ VALIDATED — No action needed (stash = HEAD)

---

## Executive Summary

Stash `stash@{0}` contains 3 source code files that are **IDENTICAL to current HEAD (72f71f7)**.

These files were previously restored in commit `3ae7dd9` ("chore: stop tracking Unity generated files + restore source files").

**Recommendation:** **DROP stash@{0}** — changes already applied in commit `3ae7dd9`.

---

## File-by-File Analysis

### File 1: `UnityExamples/JumpJumpTemplateDemo/Assets/Editor/JumpJumpWebGLBuilder.cs`

| Attribute | Value |
|---|---|
| Lines | 180 |
| Version | v0.4.2 Automated WebGL Build Pipeline |
| Type | Unity Editor Script (menu item + batch mode) |

#### Modification Purpose
Provides automated WebGL build pipeline for JumpJump demo:
- Menu: `Tools → PartyGame → Build JumpJump WebGL`
- Batch: `-executeMethod JumpJumpWebGLBuilder.BuildWebGL`
- Handles: scene creation, platform switch, PlayerSettings, build output

#### Compatibility with v1.1.4 Architecture
✅ **Compatible**
- Standalone Editor script (not runtime)
- Does not depend on PartyGameSDK runtime
- Uses standard UnityEditor API (BuildPipeline, EditorUserBuildSettings)
- **Risk:** Low (only affects development workflow)

#### Whether Worth Keeping
✅ **Yes** (but already in HEAD)
- Valuable for CI/CD automation
- Documents WebGL build steps
- **Note:** Already restored in commit `3ae7dd9`

#### Whether Already Overwritten by Subsequent Commits
✅ **YES** — identical to HEAD
- Verified via: `git diff stash@{0} -- <file>` → **no diff**
- Restored in: commit `3ae7dd9`

#### Whether Affects Five Iron Laws
✅ **NO** — Editor-only script
- Does not modify `server.js`
- Does not modify PartyGameSDK protocol
- Does not affect controller/screen/Unity runtime
- **Safe**

#### Dependencies
- UnityEditor (Editor-only, not in build)
- UnityEditor.SceneManagement
- System.IO

#### Potential Issues
⚠️ **Unity Install Path Hardcoded**
```csharp
string[] candidates = {
    Path.Combine(contentsPath, "PlaybackEngines/WebGLSupport/BuildTools/WebGLTemplates/Base/Default/TemplateData"),
    // ...
};
```
- Might fail on different machines (CI/CD)
- **Recommendation:** Use `PlayerSettings.WebGL.template` path instead

---

### File 2: `UnityExamples/JumpJumpTemplateDemo/Assets/Scripts/Game/JumpJumpGameManager.cs`

| Attribute | Value |
|---|---|
| Lines | 322 |
| Version | v0.2.6 PartyGameSDK Demo |
| Type | Unity Runtime Script (game logic) |

#### Modification Purpose
Demo game logic for JumpJump (party game demo):
1. Receives server-injected `game_message` (input.charge_start/input.charge_end/input.tap)
2. Controls player jump / score / game over
3. Broadcasts `state.score_update` / `state.game_over`
4. Handles player spawn/death, camera follow, split screen

#### Compatibility with v1.1.4 Architecture
✅ **Compatible**
- Follows PartyGameSDK pattern (via `PartyGameBridge`)
- Receives injected `playerIndex` (does not forge it)
- Broadcasts states via `PartyGameBridge.Instance.BroadcastScoreUpdate()`
- **Risk:** Low (demo script, not core SDK)

#### Whether Worth Keeping
✅ **Yes** (but already in HEAD)
- Reference implementation (shows how to use PartyGameBridge)
- Documents Five Iron Laws compliance
- **Note:** Already restored in commit `3ae7dd9`

#### Whether Already Overwritten by Subsequent Commits
✅ **YES** — identical to HEAD
- Verified via: `git diff stash@{0} -- <file>` → **no diff**
- Restored in: commit `3ae7dd9`

#### Whether Affects Five Iron Laws
✅ **NO** — actually **FOLLOWS** them
- ✅ Controller only sends input (handled by server injection)
- ✅ Unity only processes injected `playerIndex`
- ✅ Unity only broadcasts `state.xxx`
- ✅ Controller only updates UI (via server broadcast)
- ✅ Screen only forwards (not in this script, but screen/index.html complies)

**Code Evidence (Five Iron Laws compliant):**
```csharp
// ✅ Law 2: server injects playerIndex, Unity only processes it
public void OnPlatformMessage(PartyGameMessage msg)
{
    int pi = msg.playerIndex;  // ← injected by server
    switch (msg.type)
    {
        case "input.charge_start": HandleChargeStart(pi); break;
        case "input.charge_end": HandleChargeEnd(pi, chargeData?.power ?? 0.5f); break;
        case "input.tap": HandleTap(pi); break;
    }
}

// ✅ Law 4: Unity broadcasts state
void BroadcastScoreUpdate()
{
    if (PartyGameBridge.Instance == null) return;
    PartyGameBridge.Instance.BroadcastScoreUpdate(scores);
}
```

#### Dependencies
- UnityEngine
- PartyGameBridge (PartyGameSDK runtime)

#### Potential Issues
⚠️ **Hardcoded Colors**
```csharp
private static readonly Color[] Colors = {
    new Color(1f, 0.3f, 0.3f),   // Red
    new Color(0.3f, 0.5f, 1f),   // Blue
    // ...
};
```
- Limited to 8 colors (max 8 players)
- **Recommendation:** Load from `PlayerColors.asset` (ScriptableObject)

✅ **No Five Iron Laws violations**

---

### File 3: `scripts/check-unity-webgl-build.js`

| Attribute | Value |
|---|---|
| Lines | 184 |
| Version | v0.4.2 Build Validation Checker |
| Type | Node.js Script (CLI tool) |

#### Modification Purpose
Build validation checker for Unity WebGL output:
1. Checks file existence (.loader.js, .framework.js, .wasm, .data, index.html)
2. Recursive search (handles Unity's nested Build/ directory)
3. Size verification (minimum thresholds)
4. TemplateData validation
5. PartyGameBridge.jslib linkage check
6. screen/index.html linkage check

#### Compatibility with v1.1.4 Architecture
✅ **Compatible**
- Standalone Node.js script (not runtime)
- Does not depend on PartyGameSDK
- **Risk:** Low (only used for validation/testing)

#### Whether Worth Keeping
✅ **Yes** (but already in HEAD)
- Valuable for CI/CD pipeline
- Documents expected build output structure
- **Note:** Already restored in commit `3ae7dd9`

#### Whether Already Overwritten by Subsequent Commits
✅ **YES** — identical to HEAD
- Verified via: `git diff stash@{0} -- <file>` → **no diff**
- Restored in: commit `3ae7dd9`

#### Whether Affects Five Iron Laws
✅ **NO** — Node.js CLI tool
- Does not modify `server.js`
- Does not modify PartyGameSDK protocol
- Does not affect controller/screen/Unity runtime
- **Safe**

#### Dependencies
- Node.js built-in: `fs`, `path`

#### Potential Issues
⚠️ **Unity Build Output Path Assumption**
```javascript
const BUILD_DIR = process.argv[2] || path.join(__dirname, '..', 'screen', 'Build');
```
- Assumes build output is in `screen/Build/`
- **Recommendation:** Make configurable via environment variable

✅ **No Five Iron Laws violations**

---

## Validation Results

### Compatibility Check
| File | Compatible with v1.1.4 | Risk | Recommendation |
|---|---|---|---|
| JumpJumpWebGLBuilder.cs | ✅ Yes | Low | Keep (already in HEAD) |
| JumpJumpGameManager.cs | ✅ Yes | Low | Keep (already in HEAD) |
| check-unity-webgl-build.js | ✅ Yes | Low | Keep (already in HEAD) |

### Five Iron Laws Compliance
| Law | JumpJumpWebGLBuilder.cs | JumpJumpGameManager.cs | check-unity-webgl-build.js |
|---|---|---|---|
| 1. Controller only sends input | ✅ N/A (Editor) | ✅ Compliant | ✅ N/A (Node.js) |
| 2. Server injects playerIndex | ✅ N/A (Editor) | ✅ Compliant | ✅ N/A (Node.js) |
| 3. Screen/Unity handles logic | ✅ N/A (Editor) | ✅ Compliant | ✅ N/A (Node.js) |
| 4. Unity broadcasts states | ✅ N/A (Editor) | ✅ Compliant | ✅ N/A (Node.js) |
| 5. Controller updates UI | ✅ N/A (Editor) | ✅ Compliant | ✅ N/A (Node.js) |

**Result:** ✅ **ALL FILES COMPLIANT** (or N/A)

### Code Quality
| File | Issues Found | Severity |
|---|---|---|
| JumpJumpWebGLBuilder.cs | Unity install path hardcoded | ⚠️ Medium |
| JumpJumpGameManager.cs | Hardcoded player colors (max 8) | ⚠️ Low |
| check-unity-webgl-build.js | Build output path assumption | ⚠️ Low |

---

## Recommendations

### For Stash@{0}
✅ **DROP it** — changes already in HEAD (commit `3ae7dd9`)

```bash
git stash drop stash@{0}
```

### For File 1 (JumpJumpWebGLBuilder.cs)
⚠️ **Fix Unity install path detection**
- Use `EditorApplication.applicationContentsPath` to find templates
- Add fallback to `PlayerSettings.WebGL.template` path

### For File 2 (JumpJumpGameManager.cs)
⚠️ **Load player colors from ScriptableObject**
- Create `PlayerColors.asset` (ScriptableObject)
- Support >8 players (dynamic color generation)

### For File 3 (check-unity-webgl-build.js)
⚠️ **Make build output path configurable**
- Support environment variable: `PARTYGAME_BUILD_DIR`
- Support config file: `.partygame.json`

---

## Next Steps

### ✅ Safe to Proceed
1. **Drop stash@{0}:**
   ```bash
   git stash drop stash@{0}
   ```

2. **Clean up temp branch:**
   ```bash
   git checkout platform/v0.4.2
   git branch -D temp/stash-validation
   ```

3. **No further action needed** — all changes already in HEAD

### ⚠️ Optional Improvements
1. Fix Unity install path detection in `JumpJumpWebGLBuilder.cs`
2. Load player colors from ScriptableObject in `JumpJumpGameManager.cs`
3. Make build output path configurable in `check-unity-webgl-build.js`

---

## Appendix A: Commands to Execute

```bash
# 1. Drop stash@{0} (already in HEAD)
git stash drop stash@{0}

# 2. Clean up temp branch
git checkout platform/v0.4.2
git branch -D temp/stash-validation

# 3. Verify stash list (should only have stash@{0} from main)
git stash list
```

---

## Appendix B: File Hashes (for verification)

```bash
# File 1: JumpJumpWebGLBuilder.cs
md5: TBD (run `md5 <file>` to verify)
sha256: TBD (run `shasum -a 256 <file>` to verify)

# File 2: JumpJumpGameManager.cs
md5: TBD
sha256: TBD

# File 3: check-unity-webgl-build.js
md5: TBD
sha256: TBD
```

---

**End of Report**
