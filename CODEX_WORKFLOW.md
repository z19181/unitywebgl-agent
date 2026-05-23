# Codex Collaboration Workflow

## 目标

Codex 负责本地可执行任务，尤其是 Unity 6、WebGL Build、文件修改、命令行测试、日志收集。
QClaw 负责规划、规范、验收、报告、RELEASE_STATE.json 推进。

## 分工

### QClaw 负责

- 创建任务
- 写入 CODEX_TASKS.md
- 指定验收标准
- 读取 CODEX_RESULT.md
- 判断 PASS / FAIL
- 更新 RELEASE_STATE.json
- 更新 release report

### Codex 负责

- 读取 CODEX_TASKS.md
- 在本机执行任务
- 修改 Unity / Web / Node 代码
- 运行 Unity 6 batchmode
- 运行 WebGL build
- 启动 server
- 跑 smoke test
- 写入 CODEX_RESULT.md
- 不直接修改 RELEASE_STATE.json
- 不直接推进灰度阶段
- 不直接打 release tag

## 禁止 Codex 做的事

Codex 不允许：

- 修改核心协议
- 修改五条铁律
- 让 controller 发送 playerIndex
- 让 server 理解 game_message.type
- 修改 RELEASE_STATE.json 的 phase
- 打 v1.0.0 tag
- 执行生产 rollback
- 修改生产密钥、证书、域名

## Codex 可以自动做的事

Codex 可以：

- 修改 Unity 示例工程
- 修 Unity 编译错误
- 写 Editor 脚本
- Build WebGL
- 复制 Build 产物到 screen/Build
- 运行本地 server
- 跑 smoke test
- 生成日志
- 生成 CODEX_RESULT.md

## 标准交互文件

### 输入

- CODEX_TASKS.md

### 输出

- CODEX_RESULT.md
- logs/codex/
- 可选：UnityExamples/JumpJumpTemplateDemo/WEBGL_BUILD_VALIDATION_REPORT.md

## 工作流

```
QClaw 创建 CODEX_TASKS.md
       │
       ▼
用户在本机运行 Codex，读取 CODEX_TASKS.md
       │
       ▼
Codex 执行任务，写入 CODEX_RESULT.md
       │
       ▼
QClaw 读取 CODEX_RESULT.md，验收
       │
       ▼
PASS → 更新 RELEASE_STATE.json + release report
FAIL → 分析错误，生成下一轮修复任务
PARTIAL → 记录 follow-up 项
```

## 五条铁律（不可破坏）

1. Controller 只发送原始输入（input.charge_start / input.charge_end），不发送 playerIndex
2. Server 注入 playerIndex 到所有转发消息
3. Screen + Unity 负责游戏逻辑和状态计算
4. Unity 通过广播告知所有客户端状态变更
5. Controller 根据 server 转发的 broadcast 更新 UI

**所有 Codex 任务完成后，QClaw 必须验证这五条铁律未被破坏。**
