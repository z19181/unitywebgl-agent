# PartyGameSDK v0.2 LTS Candidate

> 多客户端 Unity WebGL 派对游戏架构：controller → server → screen.html → Unity

**版本**: v0.2 LTS Candidate  
**日期**: 2026-05-23  
**状态**: 🟢 完整链路完成 — 累计 267 项测试通过，0 失败  
**v0.2 策略**: 功能冻结，仅接受 bugfix。新能力进入 v0.3。

---

## 已验证游戏

| 游戏 | 输入类型 | 状态 |
|---|---|---|
| **JumpJump** | `input.charge_start/end` + `input.tap` | ✅ |
| **Flappy Bird** | `input.tap` | ✅ |
| **Breakout** | `input.move` + `input.tap` | ✅ |
| **Snake** | `input.direction` | ✅ |

---

## 架构

```
Controller ──game_message──→ Server ──game_message──→ Screen ──SendMessage──→ Unity
   (无 playerIndex)        (注入 playerIndex)         (仅转发)           (OnPlatformMessage)
                                                                               │
Controller ←──broadcast──── Server ←──broadcast──── Screen  ←────── Unity      │
  (更新 UI)              (校验 role)                (window.PG)    (Broadcast)  │
```

### 五条铁律

| # | 规则 | 状态 |
|---|---|---|
| 1 | controller 只发输入 | ✅ v0.1.0 至今 |
| 2 | server 分配并注入 playerIndex | ✅ |
| 3 | screen/Unity 负责游戏逻辑 | ✅ |
| 4 | Unity 广播状态 | ✅ |
| 5 | controller 更新 UI | ✅ |

---

## 快速开始

### 1. 启动 server

```bash
cd PartyGameSDK-MVP
npm install
node server/server.js
# → http://localhost:3000
```

### 2. screen 端

`http://localhost:3000/screen` — 自动创建房间，显示 QR Code。

### 3. controller 端

扫描 QR 或访问 `http://localhost:3000/controller?room=XXXXXX`

### 4. Unity WebGL

```bash
# 方式 A: 一键场景 + Unity Build
Tools → PartyGame → Create {GameName} Scene
File → Build Settings → WebGL → PartyGameTemplate → Build

# 方式 B: 使用示例工程
cp -r UnityExamples/JumpJumpTemplateDemo/Assets/* YourProject/Assets/
```

### 5. 自动化测试

```bash
node server/server.js &
node _test_v027.js
# → 60/60 PASS
```

---

## 版本演进

| 版本 | 核心能力 | Tag |
|---|---|---|
| v0.1.0 | 核心协议基线 | `v0.1.0` |
| v0.2.1 | QR 码 + 房间关闭 | `v0.2.1` |
| v0.2.2 | 多人 playerIndex 管理 | `v0.2.2` |
| v0.2.3 | reconnectToken 重连 | `v0.2.3` |
| v0.2.5 | Unity WebGL Template | `v0.2.5` |
| v0.2.6 | JumpJump Demo | `v0.2.6` |
| v0.2.7 | Game Template Factory + Snake | `v0.2.7` |

完整演进见 [V0_2_PLATFORM_SUMMARY.md](V0_2_PLATFORM_SUMMARY.md)

---

## 目录资产

```
PartyGameSDK-MVP/
├── server/server.js              ← v0.2.3+ 零修改
├── screen/index.html             ← screen 端
├── controller/index.html         ← controller 端
├── UnityWebGLTemplate/           ← Unity 一键模板
├── UnityExamples/                ← 示例工程
│   ├── JumpJumpTemplateDemo/     ← v0.2.6
│   ├── SnakeTemplateDemo/        ← v0.2.7
│   ├── _GameTemplateSkeleton/    ← 标准骨架
│   ├── GAME_TEMPLATE_FACTORY.md  ← 工厂规范
│   └── AGENT_GAME_GENERATION_PROMPT.md
├── V0_2_PLATFORM_SUMMARY.md      ← 完整演进
└── RELEASE_INDEX.md              ← 文档索引
```

---

## v0.2 冻结策略

- ✅ **功能冻结** — 不再新增能力
- ✅ **协议冻结** — server.js 核心协议不修改
- ⚠️ **仅接受 bugfix** — 安全/稳定性修复
- 🔜 **新能力 → v0.3 分支**

---

## v0.3 路线

| 优先级 | 项目 |
|---|---|
| 🔴 | server 日志结构化 |
| 🔴 | 房间指标统计 |
| 🟡 | WebSocket 压测 |
| 🟡 | 移动端兼容测试 |
| 🟢 | 管理后台 |
| 🟢 | CI 自动测试 |

---

**PartyGameSDK v0.2 LTS Candidate** — 267 tests, 4 games, 0 failures.
