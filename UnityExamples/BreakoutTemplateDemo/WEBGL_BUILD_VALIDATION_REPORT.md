# BreakoutTemplateDemo — WebGL Build Validation Report

**执行日期:** 2026-05-23  
**执行者:** Codex  
**任务:** Unity 6 真实 WebGL Build 验证  
**收口判定:** ✅ PASS

---

## 1. 构建信息

| 项目 | 值 |
|---|---|
| Unity 版本 | 6000.4.8f1 |
| Build 命令 | `EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 /Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity -quit -batchmode -nographics -acceptSoftwareTermsForThisRunOnly -projectPath UnityExamples/BreakoutTemplateDemo -executeMethod BreakoutWebGLBuilder.BuildWebGL -logFile logs/codex/build-breakout.log` |
| Build 输出目录 | `screen/Build_Breakout` |
| Build 结果 | ✅ Success |
| 自动检查结果 | ✅ 22/22 checks passed |

## 2. Build 产物清单

`screen/Build_Breakout/` 最终文件：

| 文件 | 说明 |
|---|---|
| `Build_Breakout.loader.js` | Unity WebGL loader |
| `Build_Breakout.framework.js` | Unity WebGL framework |
| `Build_Breakout.wasm` | WebAssembly binary |
| `Build_Breakout.data` | Unity asset data |
| `index.html` | PartyGameTemplate output page |
| `partygame-template.js` | SDK bridge script |

## 3. 自动检查结果

```bash
node scripts/check-unity-webgl-build.js screen/Build_Breakout
```

**结果: 22/22 checks passed** ✅

## 4. 失败与修复记录

### Attempt 1

- **失败原因:** WebGL link 阶段出现 duplicate symbol
- **处理:** 删除 `UnityExamples/BreakoutTemplateDemo/Library/` 和 `Temp/`，移除误拷贝的 `Assets/Scripts/Game/*` 副本

### Attempt 2

- **修复:** `BreakoutWebGLBuilder` 改为扁平化输出并使用 `BuildOptions.None`
- **结果:** ✅ Success

## 5. 已修改文件

- `UnityExamples/BreakoutTemplateDemo/Assets/Editor/CreateBreakoutScene.cs`
- `UnityExamples/BreakoutTemplateDemo/Assets/Editor/BreakoutWebGLBuilder.cs`
- `UnityExamples/BreakoutTemplateDemo/Assets/Scripts/Breakout/BallController.cs`
- `UnityExamples/BreakoutTemplateDemo/Assets/Scripts/Breakout/BreakoutGameManager.cs`
- `UnityExamples/BreakoutTemplateDemo/Assets/Scripts/Breakout/PaddleController.cs`
- `UnityExamples/BreakoutTemplateDemo/Assets/Plugins/WebGL/PartyGameBridge.jslib`
- `UnityExamples/BreakoutTemplateDemo/ProjectSettings/ProjectSettings.asset`
- `UnityExamples/BreakoutTemplateDemo/Assets/Scenes/BreakoutTemplateDemo.unity`
- `UnityExamples/BreakoutTemplateDemo/Assets/Scripts/Game/BreakoutGameManager.cs` and `PaddleController.cs` were removed

## 6. 未修改项

| 项 | 状态 |
|---|---|
| 核心协议 | 未修改 ✅ |
| `server.js` | 未修改 ✅ |
| `RELEASE_STATE.json` | 未修改 ✅ |
| 五条铁律 | 未修改 ✅ |

## 7. 结论

**收口判定: ✅ PASS**
