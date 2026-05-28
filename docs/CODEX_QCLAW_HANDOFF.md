# Codex ↔ QClaw Handoff

## 使用方式

1. QClaw 写任务到 CODEX_TASKS.md
2. 用户在本机运行 Codex
3. Codex 执行任务
4. Codex 写 CODEX_RESULT.md
5. QClaw 读取 CODEX_RESULT.md
6. QClaw 判断是否通过
7. QClaw 更新报告和 RELEASE_STATE.json

## 推荐 Codex 启动命令

在项目根目录运行：

```bash
codex
```

然后输入：

> 请读取 CODEX_TASKS.md，执行其中的任务。执行完成后写入 CODEX_RESULT.md。不要修改 RELEASE_STATE.json，不要打 tag，不要修改核心协议。

## QClaw 验收规则

### 如果 CODEX_RESULT.md status=PASS

- 读取 WEBGL_BUILD_VALIDATION_REPORT.md
- 更新 Unity WebGL Agent 状态
- 将 Unity Real Build 标记为完成

### 如果 status=PARTIAL

- 判断剩余 manual runtime check 是否阻塞
- 若不阻塞，记录为 follow-up
- 若阻塞，生成下一轮 CODEX_TASKS.md

### 如果 status=FAIL

- 读取 errors
- 生成修复任务
- 不推进发布状态

## 交接规范

### QClaw 写完 CODEX_TASKS.md 后

通知用户：

> Codex 任务已就绪。请在终端执行 codex，然后输入：请读取 CODEX_TASKS.md，执行其中的任务。完成后写入 CODEX_RESULT.md。

### Codex 执行期间 QClaw 不干预

- QClaw 不通过 exec 工具直接运行 Unity Build
- QClaw 等待用户通知 Codex 执行完成
- QClaw 不轮询 CODEX_RESULT.md 文件变更

### 并行机制

- 用户可以在两个终端分别运行 QClaw 和 Codex
- QClaw 可以生成新任务而不影响 Codex 当前执行
- Codex 执行期间 QClaw 可进行其他工作（规划、报告、文档）

## Troubleshooting

### Emscripten JSONDecodeError / JSON parse error

**症状:** Unity batchmode build 失败，日志显示：
```
json.decoder.JSONDecodeError: Expecting value: line 1 column 2 (char 1)
  at emcc.py ... get_js_sym_info
```

**根因:** Unity 6000 内置 Python 3.9 与 Node.js v22 JSON 输出格式不兼容。

**修复步骤:**

1. **优先检查 `EMSDK_PYTHON`** — 不要优先修改 PartyGameBridge、server 协议或五条铁律：
   ```bash
   EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11
   ```

2. 验证 Python 3.11 可用：
   ```bash
   /Users/applemima1111/.local/bin/python3.11 --version
   ```

3. 重新执行 Build，带上环境变量

**禁止的"修复"方式:**
- ❌ 修改 PartyGameBridge.jslib（JSONDecodeError 与此无关）
- ❌ 修改 server.js（构建阶段不涉及 server）
- ❌ 修改 game_message 协议
- ❌ 降级 Node.js

**详细说明:** 见 `UnityExamples/UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md` §2。
