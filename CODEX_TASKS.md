# Codex Task: Unity WebGL Real Build Validation with Unity 6

## 背景

PartyGameSDK 已完成：

- UnityWebGLTemplate
- JumpJumpTemplateDemo
- PartyGameBridge.cs
- PartyGameBridge.jslib
- Game Template Factory

但当前 screen/Build 为空，Unity WebGL 未真实构建验证。反向链路此前使用脚本模拟。

## 目标

使用本机 Unity 6 对 JumpJumpTemplateDemo 执行真实 WebGL Build，并验证 screen 可以加载真实 Unity WebGL canvas。

## 本机环境

- OS: macOS
- Unity: Unity 6
- 项目根目录：当前 PartyGameSDK-MVP 工作区
- Unity 示例目录：UnityExamples/JumpJumpTemplateDemo/

请 Codex 自动探测 Unity 6 可执行路径，常见路径包括：

- /Applications/Unity/Hub/Editor/*/Unity.app/Contents/MacOS/Unity
- /Applications/Unity/Hub/Editor/6000.*/Unity.app/Contents/MacOS/Unity

## 任务步骤

### 1. 检查 Unity 示例工程目录

确认存在：

- UnityExamples/JumpJumpTemplateDemo/Assets/Scripts/Platform/PartyGameBridge.cs
- UnityExamples/JumpJumpTemplateDemo/Assets/Plugins/WebGL/PartyGameBridge.jslib
- UnityExamples/JumpJumpTemplateDemo/Assets/WebGLTemplates/PartyGameTemplate/
- UnityExamples/JumpJumpTemplateDemo/Assets/Editor/CreateJumpJumpTemplateScene.cs
- UnityExamples/JumpJumpTemplateDemo/BUILD_GUIDE.md

### 2. 如果 JumpJumpTemplateDemo 不是完整 Unity project

请创建最小 Unity project 结构：

- Assets/
- Packages/
- ProjectSettings/

并保证 Unity 6 能以 -projectPath 打开。

### 3. 创建或修复 Editor 自动化脚本

必须支持命令行执行：

- CreateJumpJumpTemplateScene
- BuildWebGL

如当前没有 Build 脚本，请新增：
Assets/Editor/PartyGameWebGLBuild.cs

必须提供：
public static void BuildJumpJumpWebGL()

功能：

- 调用 CreateJumpJumpTemplateScene 或确保场景存在
- 设置 WebGL 为目标平台
- 设置 WebGL Template = PartyGameTemplate
- 将场景加入 EditorBuildSettings
- Build 输出到 ../../screen/Build 或项目根目录的 screen/Build
- 输出 Build log

> 💡 当前已存在 `Assets/Editor/JumpJumpWebGLBuilder.cs`，可直接使用，输出路径已配置为 `screen/Build`。

### 4. 执行 Unity batchmode Build

> ⚠️ **Unity 6000 必设环境变量:** `EMSDK_PYTHON` 必须指到 Python 3.11，否则会遇到 Emscripten JSONDecodeError（根因详见 `UnityExamples/UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md` §2）。

请使用以下命令（已包含环境变量）：

```bash
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11 \
/Applications/Unity/Hub/Editor/6000.4.8f1/Unity.app/Contents/MacOS/Unity \
  -quit -batchmode -nographics \
  -acceptSoftwareTermsForThisRunOnly \
  -projectPath <JumpJumpTemplateDemoProject> \
  -executeMethod JumpJumpWebGLBuilder.BuildWebGL \
  -logFile logs/codex/unity-webgl-build.log
```

**Codex 必须默认带上 `EMSDK_PYTHON` 环境变量执行所有 Unity 6 WebGL Build。**

如果命令失败：

- 读取 log
- 修复编译错误
- 最多自动修复 3 轮
- 每轮记录到 logs/codex/build-attempt-N.log

### 5. 检查 Build 产物

必须检查 screen/Build 下是否存在：

- *.loader.js
- *.framework.js
- *.data
- *.wasm

如果文件名带 hash 或项目名前缀，可以接受，但必须记录实际文件名。

### 6. 检查 screen/index.html

必须确认：

- 存在 Build.loader.js 时可以加载 Unity
- 不存在时显示 SDK-only mode / Unity Build not found
- 房间创建不依赖 Unity Build
- controller 加入不依赖 Unity Build

如果需要微调 screen/index.html，只允许做兼容性修复，不允许修改核心协议。

### 7. 启动本地服务并 smoke test

启动 PartyGameSDK server：

```
node server/server.js
```

然后检查：

- http://localhost:3000/screen/
- http://localhost:3000/controller/
- http://localhost:3000/__health

如果能做浏览器自动化测试，请验证：

- screen 页面不再长期停留在 Unity Build missing 状态
- Unity loader 被请求
- controller 可以加入房间
- input.charge_start / input.charge_end 可以发出
- screen 可以收到 game_message

如果不能自动验证 Unity canvas 内部行为，请明确标记为 manual Unity runtime check required。

### 8. 新增报告

生成：UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md

内容必须包含：

- Unity version
- Unity executable path
- Build command
- Build output directory
- Build output files
- Build success / fail
- screen loader check
- smoke test result
- known issues
- manual checks still required

### 9. 写 CODEX_RESULT.md

必须包含：

- task name
- status: PASS / FAIL / PARTIAL
- modified files
- build command
- Unity version
- build output files
- smoke test result
- errors encountered
- fixes applied
- whether core protocol changed
- whether five laws changed
- whether server.js changed
- next recommended action

## 验收标准

PASS 必须满足：

1. Unity batchmode build 成功
2. screen/Build 存在 loader.js / framework.js / data / wasm
3. screen/index.html 能识别 Build 存在
4. Node server 启动成功
5. Health endpoint 正常
6. 未修改核心协议
7. 未修改五条铁律
8. 未让 controller 发送 playerIndex
9. 未让 server 理解 game_message.type
10. 生成 WEBGL_BUILD_VALIDATION_REPORT.md
11. 生成 CODEX_RESULT.md

如果 Unity Build 成功但自动浏览器 smoke test 不完整：
status = PARTIAL
并说明 manual runtime check required。
