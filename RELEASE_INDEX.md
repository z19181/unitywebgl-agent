# RELEASE_INDEX — PartyGameSDK v0.2 LTS Candidate

> 所有关键文档索引  
> 生成日期: 2026-05-23  
> v0.2 系列冻结 — 仅 bugfix

---

## 核心文档

| 文档 | 说明 | 版本 |
|---|---|---|
| [README.md](README.md) | 首页：架构 / 快速开始 / 版本状态 | v0.2 LTS |
| [V0_2_PLATFORM_SUMMARY.md](V0_2_PLATFORM_SUMMARY.md) | **★ v0.1.0 → v0.2.7 完整演进** | v0.2 LTS |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 | v0.1.0-v0.2.x |

---

## 协议规范

| 文档 | 说明 | 版本 |
|---|---|---|
| [FINAL_SPEC.md](FINAL_SPEC.md) | v0.1.0 协议规范 | v0.1.0 |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Unity 设置指南 | v0.1.0 |
| [TEST_REPORT.md](TEST_REPORT.md) | v0.1.0 测试报告 | v0.1.0 |

---

## 版本发布报告

| 文档 | 版本 | 测试 |
|---|---|---|
| [V0_2_1_RELEASE_REPORT.md](V0_2_1_RELEASE_REPORT.md) | QR 码 + 房间关闭 | 17/17 |
| [V0_2_2_RELEASE_REPORT.md](V0_2_2_RELEASE_REPORT.md) | 多人 playerIndex 管理 | 22/22 |
| [V0_2_3_RELEASE_REPORT.md](V0_2_3_RELEASE_REPORT.md) | reconnectToken 重连 | 30/30 |
| [V0_2_5_RELEASE_REPORT.md](V0_2_5_RELEASE_REPORT.md) | Unity WebGL Template | 40/40 |
| [V0_2_6_RELEASE_REPORT.md](V0_2_6_RELEASE_REPORT.md) | JumpJump Demo | 50/50 |
| [V0_2_7_RELEASE_REPORT.md](V0_2_7_RELEASE_REPORT.md) | Game Template Factory + Snake | 60/60 |

---

## 工具链文档

| 文档 | 说明 |
|---|---|
| [GAME_TEMPLATE_FACTORY.md](UnityExamples/GAME_TEMPLATE_FACTORY.md) | ★ 新小游戏生成流程（8 大规范） |
| [AGENT_GAME_GENERATION_PROMPT.md](UnityExamples/AGENT_GAME_GENERATION_PROMPT.md) | ★ Agent 自动生成指令（6 步） |

---

## 示例工程

| 目录 | 说明 | 版本 |
|---|---|---|
| `UnityWebGLTemplate/` | Unity 一键模板 | v0.2.5 |
| `UnityExamples/JumpJumpTemplateDemo/` | JumpJump 完整示例 | v0.2.6 |
| `UnityExamples/SnakeTemplateDemo/` | Snake 验证示例 | v0.2.7 |
| `UnityExamples/_GameTemplateSkeleton/` | 标准骨架 | v0.2.7 |

---

## Git 标签

| Tag | 说明 |
|---|---|
| `v0.2-lts-candidate` | ★ v0.2 LTS Candidate 收口 |
| `v0.2.7` | Game Template Factory + Snake |
| `v0.2.6` | JumpJump Demo |
| `v0.2.5` | Unity WebGL Template |
| `v0.2.3` | reconnectToken 重连 |
| `v0.2.2` | 多人 playerIndex 管理 |
| `v0.2.1` | QR 码 + 房间关闭 |
| `v0.1.0` | 核心协议基线 |
| `game-flappy-v0.1.0` | Flappy Bird 实验 |
| `game-breakout-v0.1.0` | Breakout 实验 |

---

## v0.2 冻结声明

```
v0.2 系列已于 2026-05-23 冻结。

✅ 功能冻结 — 不再新增能力
✅ 协议冻结 — server.js 核心协议不修改
⚠️ 仅接受 bugfix — 安全/稳定性问题
🔜 新能力 → v0.3 分支
```

---

**累计测试:** 267 项通过，0 失败  
**已验证游戏:** JumpJump / Flappy Bird / Breakout / Snake  
**已验证输入:** tap / move / charge_start / charge_end / direction
