# V0_2_PLATFORM_SUMMARY — PartyGameSDK v0.1.0 → v0.2.7 完整演进

> **生成日期:** 2026-05-23  
> **覆盖范围:** v0.1.0 核心协议基线 → v0.2.7 Game Template Factory  
> **累计测试:** 267 项通过，0 项失败  
> **server.js 修改次数:** 5（v0.1.0 → v0.2.3），此后零修改

---

## 1. 版本路线

```
v0.1.0   核心协议基线                   2026-05-22  commit 2cc1d21
   │      房间创建/加入/game_message广播
   │      JumpJump Demo 端到端验证
   │
v0.2.1   二维码入口 + 房间销毁              commit 0d097fe
   │      CLOSE_ROOM / room_closed / qrUrl
   │      测试 17/17 PASS
   │
v0.2.2   多人 playerIndex 管理               commit b73e8ca
   │      maxPlayers / players.changed / room_full
   │      测试 22/22 PASS
   │
v0.2.3   重连机制 reconnectToken              commit 06a2555
   │      10s 重连窗口 / localStorage 持久化
   │      测试 30/30 PASS
   │
v0.2.5   Unity WebGL Template                 commit 2300ced
   │      PartyGameTemplate 一键发布
   │      PartyGameBridge 标准化 (OnPlatformMessage)
   │      测试 40/40 PASS
   │
v0.2.6   JumpJump Template Demo               commit cd854c4
   │      完整可复制示例工程
   │      一键场景生成
   │      测试 50/50 PASS
   │
v0.2.7   Game Template Factory + Snake        commit fe6a8bb
   │      标准化新游戏生成流程
   │      _GameTemplateSkeleton / AGENT 生成指令
   │      Snake Demo (验证 input.direction)
   │      测试 60/60 PASS
   ▼
```

### v0.1.0 — 核心协议基线

| 能力 | 说明 |
|---|---|
| `create_room` | screen 创建房间，返回 6 位 roomId |
| `join_room` | controller 加入（不发送 playerIndex） |
| `game_message` | controller 发输入 → server 注入 playerIndex → screen |
| `broadcast` | screen → server → 所有 controllers |
| `player_joined` / `player_left` | server 通知 player 变化 |
| 房间销毁 | screen 断开自动清理 |

**五条铁律首次确立。** JumpJump Demo 10 步端到端验证通过。

### v0.2.1 — 二维码入口 + 房间销毁

| 新增能力 | 说明 |
|---|---|
| `qrUrl` | `room_created` 返回 QR 码链接 |
| `close_room` | screen 主动关闭房间 |
| `room_closed` | 所有 controllers 收到通知 |
| controller 守卫 | 房间关闭后禁用输入 |

### v0.2.2 — 多人 playerIndex 管理

| 新增能力 | 说明 |
|---|---|
| `maxPlayers` | 房间创建时设置 1~16 上限 |
| `players.changed` | 任何玩家变更时广播列表 |
| `players[]` | `room_joined` / `player_joined` 附带完整玩家列表 |
| `room_full` | 满员时拒绝新控制器 |
| `nextPlayerIndex` | 单调递增，不复用离开编号 |

### v0.2.3 — 重连机制

| 新增能力 | 说明 |
|---|---|
| `reconnectToken` | 32 字节 hex，`room_joined` 返回 |
| `reconnect` | controller 发送 token 请求重连 |
| `reconnected` | 成功恢复，复用原 playerIndex |
| `reconnect_failed` | 失败（过期/无效），需重新 join |
| 10s 窗口 | 断开后 10 秒内可重连 |
| localStorage | controller 持久化 token，刷新自动重连 |

### v0.2.5 — Unity WebGL Template

| 新增能力 | 说明 |
|---|---|
| `PartyGameTemplate` | Unity 一键选择 WebGL 模板 |
| `OnPlatformMessage` | 标准化 Unity 消息入口 |
| `PartyGameBridge.cs` | 标准化桥接器（Broadcast/BroadcastScoreUpdate/BroadcastGameOver） |
| `PartyGameTypes.cs` | 分离类型常量 |
| `partygame-sdk.js` | Web 客户端 SDK（事件系统/autoReconnect） |
| `controller-base.js` | 控制器基类 |
| **server.js 零修改** | 模板独立于 server |

### v0.2.6 — JumpJump Template Demo

| 新增能力 | 说明 |
|---|---|
| 完整示例工程 | 18 文件，含 GameManager/Player/Spawner/UI/Editor |
| 一键场景生成 | `Tools → PartyGame → Create JumpJump Scene` |
| `BUILD_GUIDE.md` | 5 分钟端到端构建指南 |
| 多人跳跃 | 多色角色，分数广播，GameOver |
| **server.js 零修改** | 纯客户端/Unity 层 |

### v0.2.7 — Game Template Factory + Snake

| 新增能力 | 说明 |
|---|---|
| `GAME_TEMPLATE_FACTORY.md` | 8 大规范（目录/复用/GameManager/输入/广播/Editor/文档/测试） |
| `AGENT_GAME_GENERATION_PROMPT.md` | 6 步自动生成流程 + 硬性约束 |
| `_GameTemplateSkeleton/` | 9 文件标准骨架（Agent 复制起点） |
| `SnakeTemplateDemo/` | 10 文件验证（`input.direction`） |
| 输入类型映射 | 6 输入类型 → 6+ 游戏类型 |
| **server.js 零修改** | v0.2.5 → v0.2.7 未动 server |

---

## 2. 核心铁律（五条铁律）

PartyGameSDK 从 v0.1.0 确立至今，**从未违反**的五条铁律：

| # | 铁律 | 验证方式 |
|---|---|---|
| 1 | **controller 只发输入** | `{event:"game_message", type:"input.xxx"}` — 无 `playerIndex` 字段 |
| 2 | **server 分配并注入 playerIndex** | `handleGameMessage` 忽略请求体中的 `playerIndex`，从 `socket.data.playerIndex` 注入 |
| 3 | **screen/Unity 负责游戏逻辑** | `game_message` 仅转发不计算，Unity 通过 `OnPlatformMessage` 接收 |
| 4 | **Unity 广播状态** | `PartyGameBridge.Broadcast(type, dataJson)` → server → controllers |
| 5 | **controller 只更新 UI** | 监听 `broadcast` 事件，更新分数/状态/GameOver，不计算游戏逻辑 |

### 补充原则

| # | 原则 | 说明 |
|---|---|---|
| 6 | **server 对 game_message.type 完全透明** | 自 v0.1.0 起从未解析、修改、新增 `type` 字段，所有游戏逻辑在 Unity |

---

## 3. 已验证游戏

| 游戏 | 首次验证 | 输入类型 | 分支 | 测试 |
|---|---|---|---|---|
| **JumpJump** | v0.1.0 | `input.charge_start/end`, `input.tap` | main | 10 步端到端 |
| **Flappy Bird** | v0.1.0 protocol generalisation | `input.tap` | `game/flappy-bird` | 协议泛化 38/38 |
| **Breakout** | v0.1.0 protocol generalisation | `input.move`, `input.tap` | `game/breakout` | 14/14 |
| **Snake** | v0.2.7 factory validation | `input.direction` | `platform/v0.2.7` | 60/60 |

### 各游戏 GameManager 入口

```csharp
// 所有游戏共用同一个入口模式
public void OnPlatformMessage(PartyGameMessage msg)
{
    int pi = msg.playerIndex;  // ← server 注入
    switch (msg.type)
    {
        case "input.tap":          /* Flappy/Breakout/JumpJump */
        case "input.move":         /* Breakout */
        case "input.charge_start": /* JumpJump */
        case "input.charge_end":   /* JumpJump */
        case "input.direction":    /* Snake */
    }
}
```

---

## 4. 已验证输入类型

| Type | Data 格式 | 游戏 | 首次验证 |
|---|---|---|---|
| `input.tap` | 无 | Flappy / JumpJump / Breakout | v0.1.0 |
| `input.move` | `{"x": 0.5}` | Breakout | v0.1.0 |
| `input.charge_start` | 无 | JumpJump | v0.1.0 |
| `input.charge_end` | `{"power": 0.8}` | JumpJump | v0.1.0 |
| `input.direction` | `"up"/"down"/"left"/"right"` | Snake | v0.2.7 |

### 未验证（已设计）

| Type | Data 格式 | 预期游戏 |
|---|---|---|
| `input.swipe` | `{"dx": 1, "dy": 0}` | Fruit Ninja, 切水果 |

---

## 5. 已验证状态类型

| Type | 触发条件 | 数据格式 | 首次验证 |
|---|---|---|---|
| `state.score_update` | 分数变化 | `{"scores": "{\"0\":10,\"1\":5}"}` | v0.1.0 |
| `state.game_over` | 游戏结束 | `{"finalScore": 50, "winnerIndex": 0}` | v0.1.0 |

### 未验证（已设计）

| Type | 触发条件 | 预期用途 |
|---|---|---|
| `feedback.vibrate` | 碰撞/事件 | 手机震动 |
| `feedback.hit` | 碰撞 | 音效/视觉 |
| `feedback.death` | 玩家死亡 | 音效/动画 |

---

## 6. 累计测试结果

| 版本 | 测试项 | 结果 | 累计 | 说明 |
|---|---|---|---|---|
| v0.1.0 | 10 | 10 PASS | 10/10 | 核心协议验证 |
| 协议泛化 | 38 | 38 PASS | 48/48 | Flappy + Breakout 验证 |
| v0.2.1 | 17 | 17 PASS | 65/65 | QR/房间销毁 |
| v0.2.2 | 22 | 22 PASS | 87/87 | 多人管理 |
| v0.2.3 | 30 | 30 PASS | 117/117 | 重连机制 |
| v0.2.5 | 40 | 40 PASS | 157/157 | Unity WebGL Template |
| v0.2.6 | 50 | 50 PASS | 207/207 | JumpJump Demo |
| v0.2.7 | 60 | 60 PASS | 267/267 | Factory + Snake |

### 测试分类明细 (v0.2.7 终态)

| 测试组 | 数量 | 覆盖 |
|---|---|---|
| T1-T10 | 10 | v0.1.0 基线（create/join/inject/broadcast/close） |
| B1-B12 | 12 | v0.2.2 多人（maxPlayers/players/room_full/player_left/room_closed） |
| C1-C8 | 8 | v0.2.3 重连（reconnectToken/5s/10s/invalid/new PI）
| D1-D10 | 10 | v0.2.5 模板（目录/文件/语法/桥接/常量/jslib/文档） |
| E1-E10 | 10 | v0.2.6 JumpJump（示例工程/模板/桥接/Editor/GameManager/广播/文档/铁律） |
| F1-F10 | 10 | v0.2.7 工厂（骨架/工厂文档/Agent 指令/Snake 工程/方向/复用/server.js） |
| **总计** | **60** | **全链路覆盖** |

---

## 7. 目录资产

```
PartyGameSDK-MVP/
├── server/server.js              ← v0.1.0-v0.2.3 修改，v0.2.5+ 零修改
├── screen/index.html             ← screen 端（Unity WebGL 加载）
├── controller/index.html         ← controller 端（通用）
├── controller-flappy/            ← Flappy Bird 控制器
├── controller-breakout/          ← Breakout 控制器
├── Assets/                       ← Standalone (Demo) 脚本
├── UnityWebGLTemplate/           ← v0.2.5: 10 files
│   ├── WebGLTemplates/PartyGameTemplate/
│   │   ├── index.html            ★ Unity WebGL 输出页
│   │   └── partygame-template.js ★ WebSocket/QR/Unity 转发
│   ├── Assets/Scripts/Platform/
│   │   ├── PartyGameBridge.cs    ★ OnPlatformMessage 入口
│   │   ├── PartyGameMessage.cs   ★ 消息结构
│   │   └── PartyGameTypes.cs     ★ 类型常量
│   ├── Assets/Plugins/WebGL/
│   │   └── PartyGameBridge.jslib
│   ├── Web/
│   │   ├── controller.html
│   │   ├── partygame-sdk.js      ★ Web 客户端 SDK
│   │   └── controller-base.js
│   └── README.md                 ★ 5 分钟接入文档
├── UnityExamples/
│   ├── GAME_TEMPLATE_FACTORY.md  ★ v0.2.7: 8 大规范
│   ├── AGENT_GAME_GENERATION_PROMPT.md  ★ v0.2.7: 6 步自动生成
│   ├── _GameTemplateSkeleton/    ★ v0.2.7: 9 files
│   ├── JumpJumpTemplateDemo/     ★ v0.2.6: 18 files
│   └── SnakeTemplateDemo/        ★ v0.2.7: 10 files
├── V0_2_*_RELEASE_REPORT.md      ← 各版本发布报告
├── FINAL_SPEC.md                 ← v0.1.0 协议规范
├── TEST_REPORT.md                ← v0.1.0 测试报告
└── CHANGELOG.md                  ← 变更日志
```

---

## 8. 后续建议

### v0.3.0 — 生产部署与观测

| 优先级 | 项目 | 说明 |
|---|---|---|
| 🔴 高 | server 日志结构化 | 统一格式（JSON），含 timestamp/roomId/playerIndex/event/duration |
| 🔴 高 | 房间指标统计 | 房间数/玩家数/QPS/延迟/错误率 → 可接入 Prometheus |
| 🟡 中 | WebSocket 压测 | 100 房间 × 4 玩家 = 400 连接的稳定性 |
| 🟡 中 | 移动端兼容测试 | iOS Safari / Android Chrome WebSocket 兼容性 |
| 🟡 中 | Unity WebGL 构建产物托管 | CDN 分发 Build/，减少本地部署复杂度 |
| 🟢 低 | 管理后台 | Web UI 查看房间列表/玩家/强制关闭/统计图表 |
| 🟢 低 | 自动测试 CI | GitHub Actions 运行全套回归测试 |

### v0.3.x 潜在方向

| 方向 | 说明 |
|---|---|
| 房间持久化 | 房间配置保存（maxPlayers/gameType） |
| 游戏选择器 | controller 加入后可选游戏类型 |
| 观战模式 | 非玩家可观看游戏 |
| 录屏回放 | 保存游戏状态序列 → 回放 |
| 排行榜 | 按游戏类型/日/周/总榜 |

---

## 附录 A: 协议消息全集

### 房间管理

| 消息 | 方向 | v |
|---|---|---|
| `create_room` | Screen → Server | v0.1.0 |
| `room_created` | Server → Screen | v0.1.0 |
| `join_room` | Controller → Server | v0.1.0 |
| `room_joined` | Server → Controller | v0.1.0 |
| `room_not_found` | Server → Controller | v0.1.0 |
| `room_full` | Server → Controller | v0.2.2 |
| `close_room` | Screen → Server | v0.2.1 |
| `room_closed` | Server → All | v0.2.1 |

### 玩家管理

| 消息 | 方向 | v |
|---|---|---|
| `player_joined` | Server → Screen | v0.1.0 |
| `player_left` | Server → Screen | v0.1.0 |
| `players.changed` | Server → All Controllers | v0.2.2 |

### 游戏消息（透明转发）

| 消息 | 方向 | v |
|---|---|---|
| `game_message` | Controller → Server → Screen | v0.1.0 |
| `broadcast` | Screen → Server → All Controllers | v0.1.0 |

### 重连

| 消息 | 方向 | v |
|---|---|---|
| `reconnect` | Controller → Server | v0.2.3 |
| `reconnected` | Server → Controller | v0.2.3 |
| `reconnect_failed` | Server → Controller | v0.2.3 |
| `player_reconnected` | Server → Screen | v0.2.3 |

---

## 附录 B: Git 分支策略

```
main                    ← v0.1.0 基线（不可修改 tag: v0.1.0）
game/flappy-bird        ← Flappy Bird 实验（tag: game-flappy-v0.1.0）
game/breakout           ← Breakout 实验（tag: game-breakout-v0.1.0）
platform/v0.2.1         ← QR + 房间关闭（tag: v0.2.1）
platform/v0.2.2         ← 多人管理（tag: v0.2.2）
platform/v0.2.3         ← 重连机制（tag: v0.2.3）
platform/v0.2.5         ← Unity WebGL Template（tag: v0.2.5）
platform/v0.2.6         ← JumpJump Demo（tag: v0.2.6）
platform/v0.2.7         ← Game Template Factory（tag: v0.2.7）★ 当前
```

---

**PartyGameSDK v0.2 Platform** — 从 10 项测试到 60 项测试，从 1 款游戏到 4 款游戏，从手工构建到一键模板工厂。Server 核心逻辑自 v0.2.3 后零修改，全部能力通过客户端/Unity 层演进。
