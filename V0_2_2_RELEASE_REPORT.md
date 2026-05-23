# PartyGameSDK v0.2.2 发布报告

**日期：** 2026-05-22 PDT  
**提交：** `84a7b45`  
**标签：** `v0.2.2`  
**分支：** `platform/v0.2.2`  
**父版本：** `v0.2.1` (`aa7af2e`)  
**测试结果：** 22/22 PASS

---

## 1. 版本信息

| 项目 | 值 |
|------|-----|
| **Commit** | `84a7b45` |
| **Tag** | `v0.2.2` |
| **Branch** | `platform/v0.2.2` |
| **Parent** | `v0.2.1` (`aa7af2e`) |
| **Base Commit** | `v0.1.0` (`2cc1d21`) |

---

## 2. 新增能力

### 2.1 maxPlayers 管理
- `create_room` 支持 `maxPlayers` 参数（1-16，默认 4）
- `room_created` 返回 `maxPlayers` 字段
- 满员时返回 `room_full`，拒绝加入

### 2.2 players[] 有序列表
- 房间结构新增 `players[]` 数组（按 `playerIndex` 升序）
- `room_joined` 携带完整 `players[]` 列表
- `player_joined` / `player_left` 携带 `players[]` 列表

### 2.3 players.changed 广播
- 玩家加入/离开后，server 广播 `players.changed` 给**所有** controllers
- Screen 和 Controller 都能感知当前玩家状态

### 2.4 Screen 玩家列表 UI
- 新增 `playersPanel` 面板
- 显示 `P{index} {name}`，当前玩家带 ★ 标记
- 标题显示 `X/maxPlayers 人`

### 2.5 Controller playersPanel UI
- 状态栏下方新增 `playersPanel`
- 显示 `★ P0 Alice  |  · P1 Bob`
- 房间关闭时自动隐藏

### 2.6 新增消息类型

| 事件 | 方向 | 说明 |
|------|------|------|
| `players.changed` | server → screen, controllers | 玩家列表变更通知 |
| `room_full` | server → controller | 房间已满，拒绝加入 |

---

## 3. playerIndex 策略

### 3.1 分配规则
- `join_room` 时由 **server 分配** `playerIndex`
- 存储在 `socket.data.playerIndex`，严格对应
- Controller **不允许**指定 `playerIndex`（server 强制覆盖）

### 3.2 分配算法
- 使用 `room.nextPlayerIndex++` 策略
- 新玩家分配当前 `nextPlayerIndex`，然后自增
- **v0.2.2 暂不复用离开玩家的 `playerIndex`**（简化逻辑）

### 3.3 满员拦截
- `room.controllers.size >= room.maxPlayers` 时返回 `room_full`
- `room_full` 消息包含 `maxPlayers` 字段

### 3.4 安全保证
- Controller 发送 `game_message` 时，server 忽略请求体中的 `playerIndex`
- Server 从 `socket.data.playerIndex` 注入真实 `playerIndex`
- 伪造 `playerIndex=999` 会被强制覆盖为真实值

---

## 4. 保持不变的规则

### 4.1 五条铁律

| # | 规则 | 合规 |
|---|------|------|
| 1 | Controller **只发输入** | ✅ 无 `playerIndex`，server 注入 |
| 2 | Server **分配并注入** `playerIndex` | ✅ `socket.data.playerIndex` |
| 3 | Screen/Unity **负责游戏逻辑** | ✅ Server 完全透传 `game_message` |
| 4 | Unity **广播状态** | ✅ `broadcast` 消息透传 |
| 5 | Controller **更新 UI** | ✅ Controller 处理 `score_update` |

### 4.2 协议透明性
- `game_message.type` **继续透明转发**（JumpJump/Flappy/Breakout 无需修改）
- Server 不解析 `game_message` 内容，只注入 `playerIndex`
- 累计测试通过：**38/38**（3 款游戏 × 多种输入类型）

### 4.3 分支保护
- `v0.1.0` 标签（`2cc1d21`）不可修改
- 所有实验从新分支开始
- `platform/v0.2.2` 基于 `v0.2.1`，只新增功能，不修改核心协议

---

## 5. 测试结果

### 5.1 v0.2.1 基线回归（10/10 PASS）

| # | 测试 | 结果 |
|---|------|------|
| T1 | `create_room` → `roomId` | ✅ |
| T2 | `join_room` → `playerIndex=0` | ✅ |
| T3 | Server 注入 `playerIndex=0` | ✅ |
| T4 | 伪造 `playerIndex=999` 被拦截 | ✅ |
| T5 | 第二个 controller → `playerIndex=1` | ✅ |
| T6 | `state.score_update` 广播 | ✅ |
| T7 | `state.game_over` 广播 | ✅ |
| T8 | `room_created` 含 `qrUrl` | ✅ |
| T9 | `close_room` → `room_closed` | ✅ |
| T10 | 关闭后 `join_room` → `room_not_found` | ✅ |

### 5.2 v0.2.2 专项（12/12 PASS）

| # | 测试 | 结果 |
|---|------|------|
| B1 | 默认 `maxPlayers=4` | ✅ |
| B2 | 可指定 `maxPlayers=2` | ✅ |
| B3 | P0 加入成功，收到 `players` 列表 | ✅ |
| B4 | P1 加入成功，`players` 列表为 2 人 | ✅ |
| B5 | `maxPlayers=2` 时 P2 收到 `room_full` | ✅ |
| B6 | P0/P1 的 `playerIndex` 不重复 | ✅ |
| B7 | P0 发送 `input.tap` → Screen 收到 `playerIndex=0` | ✅ |
| B8 | P1 发送 `input.tap` → Screen 收到 `playerIndex=1` | ✅ |
| B9 | P0 离开 → Screen 收到 `player_left` | ✅ |
| B10 | P0 离开后 `players.changed` → 列表剩 P1 | ✅ |
| B11 | P0 离开后 P1 继续发送 → `playerIndex` 仍为 1 | ✅ |
| B12 | `close_room` → 所有 controllers 收到 `room_closed` | ✅ |

### 5.3 总计

| 组别 | 通过 | 失败 | 通过率 |
|------|------|------|--------|
| v0.2.1 基线回归（T1-T10） | 10 | 0 | 100% |
| v0.2.2 专项（B1-B12） | 12 | 0 | 100% |
| **总计** | **22** | **0** | **100%** |

---

## 6. 风险和后续

### 6.1 当前限制

| 限制 | 说明 | 影响 |
|------|------|------|
| ❌ 暂不支持断线重连 | Controller/Screen 断开后需重新加入 | 网络不稳定时体验差 |
| ❌ 暂不复用离开玩家编号 | `playerIndex` 只增不减 | 长时间运行后 `playerIndex` 可能很大 |
| ❌ 暂无观众模式 | 满员后无法以观众身份加入 | 大型聚会场景受限 |
| ❌ 暂无心跳检测 | 无法检测半开连接 | 可能浪费服务器资源 |

### 6.2 后续版本规划

| 版本 | 功能 | 优先级 | 状态 |
|------|------|--------|------|
| **v0.2.3** | **断线重连（reconnectToken）** | 🔴 高 | 📋 建议下一步 |
| v0.2.4 | 心跳保活（heartbeat） | 🟡 中 | 📋 待定 |
| **v0.2.5** | **Unity WebGL Template 标准化** | 🔴 高 | 📋 建议下一步 |
| v0.3.0 | 观众模式 | 🟢 低 | 📋 待定 |
| v0.3.1 | 小游戏模板工厂 | 🟡 中 | 📋 待定 |

### 6.3 v0.2.3 断线重连设计建议

**目标：** Controller/Screen 断开后，可在 **10 秒内** 使用 `reconnectToken` 重新加入原房间，无需重新分配 `playerIndex`。

**协议扩展：**
```json
// Controller → Server (重连请求)
{
  "event": "reconnect",
  "reconnectToken": "abc123..."
}

// Server → Controller (重连成功)
{
  "event": "reconnected",
  "playerIndex": 0,
  "roomId": "A1B2C3",
  "players": [...]
}
```

**实现要点：**
1. `handleCreateRoom` 生成 `reconnectToken`（存储在 `room` 对象）
2. `room_joined` 返回 `reconnectToken`
3. Controller 断开时，**不立即删除**，标记为 `disconnected`，启动 **10 秒倒计时**
4. 倒计时内收到 `reconnect` → 恢复连接，复用 `playerIndex`
5. 倒计时结束 → 删除 Controller，广播 `player_left`

### 6.4 v0.2.5 Unity WebGL Template 设计建议

**目标：** 标准化 Unity WebGL 输出，自动注入 `PartyGameBridge.jslib` 和 `screen/index.html` 模板。

**文件结构：**
```
Assets/
  WebGLTemplates/
    PartyGameSDK/
      index.html        # Screen 模板（自动注入 PartyGameBridge）
      PartyGameBridge.jslib  # 桥接文件
      style.css           # 默认样式
```

**使用方式：**
1. Unity Editor → Player Settings → WebGL Template → 选择 `PartyGameSDK`
2. Build 后自动生成符合 PartyGameSDK 协议的 `screen/index.html`

---

## 附录 A：协议消息格式

### A.1 room_full

```json
{
  "event": "room_full",
  "roomId": "A1B2C3",
  "maxPlayers": 4
}
```

### A.2 players.changed

```json
{
  "event": "players.changed",
  "players": [
    { "playerIndex": 0, "playerName": "Player 0" },
    { "playerIndex": 1, "playerName": "Player 1" }
  ]
}
```

### A.3 room_joined（扩展）

```json
{
  "event": "room_joined",
  "roomId": "A1B2C3",
  "playerIndex": 0,
  "playerName": "Player 0",
  "maxPlayers": 4,
  "players": [
    { "playerIndex": 0, "playerName": "Player 0" }
  ]
}
```

---

## 附录 B：文件变更清单

| 文件 | 变更类型 | 行数变化 |
|------|----------|----------|
| `server/server.js` | 修改 | +187 / -52 |
| `screen/index.html` | 修改 | +92 / -18 |
| `controller/index.html` | 修改 | +124 / -23 |
| `V0_2_2_RELEASE_REPORT.md` | 新增 | +192 |

---

**报告生成时间：** 2026-05-22 22:40 PDT  
**生成工具：** OpenClaw Agent  
**协议版本：** PartyGameSDK v0.2.2
