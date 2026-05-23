# Codex 协作机制创建

**时间:** 2026-05-23 09:16 PDT
**项目:** PartyGameSDK-MVP v0.4.2

## 目标

为 PartyGameSDK 项目新增 Codex 协作机制，让 Codex 负责本地 Unity 6 / WebGL 真实构建执行，QClaw 负责规划、验收和发布状态推进。

## 新增文件

| # | 文件 | 大小 | 用途 |
|---|------|------|------|
| 1 | `CODEX_WORKFLOW.md` | 2.2K | Codex 协作工作流规范：分工、禁止事项、允许事项、交互文件、五条铁律 |
| 2 | `CODEX_TASKS.md` | 4.8K | 首个任务：Unity WebGL Real Build Validation with Unity 6（9 步详细指令） |
| 3 | `CODEX_RESULT.md` | 209B | Codex 输出占位（status: PENDING, awaiting_codex_execution: true） |
| 4 | `docs/CODEX_QCLAW_HANDOFF.md` | 1.6K | QClaw ↔ Codex 交接规范（使用方式、验收规则、并行机制） |
| 5 | `logs/codex/.gitkeep` | 0B | Codex 构建日志目录 |

## 关键设计决策

- **Codex 使用已有的 JumpJumpWebGLBuilder.cs**（输出已配置为 screen/Build），无需额外新建
- **三条红色警戒线**：Codex 禁止修改核心协议、五条铁律、RELEASE_STATE.json
- **验收 11 条标准**：从 Unity batchmode build → Build 产物检查 → smoke test → 铁律验证
- **PARTIAL 状态处理**：Build 成功但 smoke test 不完整时标 PARTIAL，记录 manual runtime check

## 已知状态

- JumpJumpTemplateDemo 已有完整 Unity 项目结构（Library/Packages/ProjectSettings）
- Assets/Editor/JumpJumpWebGLBuilder.cs 已存在
- screen/Build/ 当前为空
- screen/index.html 已包含 Unity 加载逻辑
