# Unity WebGL Real Build Validation 收口

**时间:** 2026-05-23 10:42 PDT
**判定:** PARTIAL PASS

## 收口输出

| # | 文件 | 操作 | 大小 |
|---|------|------|------|
| 1 | `UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md` | 更新 | 5.0K |
| 2 | `CODEX_RESULT.md` | 更新（PENDING→PARTIAL PASS） | 3.4K |
| 3 | `UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md` | 新建 | 4.6K |
| 4 | `docs/QA_MOBILE_LOG.md` | 追加 Unity WebGL 章节 | 3.7K |

## 判定依据

### 通过项
- Unity 6 (6000.4.8f1) batchmode WebGL Build ✅
- screen/Build 真实产物（loader.js/framework.js/wasm/data/index.html） ✅
- `scripts/check-unity-webgl-build.js` 22/22 PASS ✅
- 所有 HTTP endpoint (health/screen/controller/Build.loader.js) 200 OK ✅
- 核心协议未修改 ✅
- 五条铁律未破坏 ✅
- server.js 零修改 ✅
- RELEASE_STATE.json 未修改 ✅

### 缺口
- 浏览器级 Unity canvas runtime 未自动验证（环境无 playwright）
- Unity WebGL Real Build Gate 10 项人工验证 pending

## Emscripten Root Cause
前 5 次 build 失败根因：PartyGameBridge.jslib 顶层 console.log 污染 Emscripten 符号 JSON 流 → json.decoder.JSONDecodeError。修复：移除顶层日志。

## 下一步
人工执行 `UnityExamples/UNITY_WEBGL_REAL_BUILD_GATE.md` 中 10 项验证。全部通过后可升级为 PASS。
