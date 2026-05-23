# PartyGameSDK v0.2.2 Release Report

**Date:** 2026-05-22 PDT  
**Commit:** `b73e8ca`  
**Tag:** `v0.2.2`  
**Branch:** `platform/v0.2.2`  
**Parent:** `v0.2.1` (`aa7af2e`)  
**Test Result:** 22/22 PASS

---

## 1. 变更概述

v0.2.2 在 v0.2.1 基础上新增 **maxPlayers 管理** 和 **players 列表同步**，让 Screen 和 Controller 都能感知当前房间的玩家状态。

---

## 2. 协议变更

### 新增消息类型

| 事件 | 方向 | 说明 |
|------|------|------|
| `players.changed` | server → screen, server → controllers | 玩家列表变更通知 |
| `room_full` | server → controller | 房间已满，拒绝加入 |

### 消息扩展

| 事件 | 变更 |
|------|------|
| `room_joined` | 新增 `players[]` 和 `maxPlayers` 字段 |
| `player_joined` | 新增 `players[]` 字段 |
| `player_left` | 新增 `players[]` 字段 |
| `room_created` | 新增 `maxPlayers` 字段 |
| `create_room` | 支持 `maxPlayers` 参数（1-16，默认4） |

### `players.changed` 消息格式

```json
{
  "event": "players.changed",
  "players": [
    { "playerIndex": 0, "playerName": "Player 0" },
    { "playerIndex": 1, "playerName": "Player 1" }
  ]
}
```

### `room_full` 消息格式

```json
{
  "event": "room_full",
  "roomId": "A1B2C3",
  "maxPlayers": 4
}
```

---

## 3. 服务器变更 (server/server.js)

### 房间结构新增字段

```javascript
const room = {
  roomId,
  screenSocket: ws,
  controllers: new Map(),  // ws → { playerIndex, playerName }
  players: [],              // v0.2.2: 有序玩家列表
  nextPlayerIndex: 0,
  maxPlayers                // v0.2.2: 最大玩家数
};
```

### handleCreateRoom
- 接受 `message.maxPlayers` 参数（1-16，默认4）
- 返回 `room_created` 包含 `maxPlayers`

### handleJoinRoom
- 新增满员检查：`room.controllers.size >= room.maxPlayers` → `room_full`
- 成功后 `room.players = getPlayersList(room)`
- 通知 screen: `player_joined`（带 players 数组）
- **广播 `players.changed` 给所有 controllers**

### handleDisconnect (controller 断开)
- 删除 controller 后更新 `room.players`
- 通知 screen: `player_left`（带 players 数组）
- **广播 `players.changed` 给剩余 controllers**

### 辅助函数
- `getPlayersList(room)`: 从 controllers Map 构建有序 players 数组
- `broadcastToControllers(room, message)`: 广播消息给所有 controller
- `sendToScreen(room, message)`: 向 screen 发送消息（带校验）

---

## 4. Screen 变更 (screen/index.html)

### 新增功能
- `handlePlayersChanged(message)`: 处理 `players.changed` 事件
- `players` 变量存储完整玩家信息 `{ playerIndex, playerName }`
- `renderPlayerList()`: 显示玩家名称、人数/上限、★标记当前玩家

### UI 更新
- 玩家列表标题显示 `人数/上限 人`
- 每行显示 `P{index} {name}`，当前玩家带 ★ 标记
- room_created 时显示二维码下方标注最大人数

---

## 5. Controller 变更 (controller/index.html)

### 新增功能
- `handlePlayerJoinedCtrl`, `handlePlayerLeftCtrl`, `handlePlayersChangedCtrl`
- `players` 状态变量存储当前玩家列表
- `renderPlayersListCtrl()`: 渲染玩家列表（★标记自己）
- 新增 `playersPanel` 面板显示玩家列表

### UI 更新
- 状态栏下方新增 `playersPanel`：显示 `★ P0 Player 0  |  · P1 Player 1`
- 房间关闭时隐藏玩家列表面板

---

## 6. 测试覆盖 (22/22 PASS)

### A. v0.2.1 基线回归 (10/10)
| # | 测试 | 结果 |
|---|------|------|
| T1 | create_room → roomId | ✅ |
| T2 | join_room → playerIndex=0 | ✅ |
| T3 | server 注入 playerIndex=0 | ✅ |
| T4 | 伪造 playerIndex=999 被拦截 | ✅ |
| T5 | 第二个 controller → playerIndex=1 | ✅ |
| T6 | state.score_update 广播 | ✅ |
| T7 | state.game_over 广播 | ✅ |
| T8 | room_created 含 qrUrl | ✅ |
| T9 | close_room → room_closed | ✅ |
| T10 | 关闭后 join → room_not_found | ✅ |

### B. v0.2.2 专项 (12/12)
| # | 测试 | 结果 |
|---|------|------|
| B1 | 默认 maxPlayers=4 | ✅ |
| B2 | 可指定 maxPlayers=2 | ✅ |
| B3 | P0 加入收到 players 列表 | ✅ |
| B4 | P1 加入后列表 2 人 | ✅ |
| B5 | 满员后 P2 收到 room_full | ✅ |
| B6 | playerIndex 无重复 | ✅ |
| B7 | P0 发送 game_message → playerIndex=0 | ✅ |
| B8 | P1 发送 game_message → playerIndex=1 | ✅ |
| B9 | P0 离开 → screen 收到 player_left | ✅ |
| B10 | P0 离开后 players.changed → 剩 P1 | ✅ |
| B11 | P0 离开后 P1 继续 → playerIndex 仍为 1 | ✅ |
| B12 | close_room → 所有 controllers 收到 room_closed | ✅ |

---

## 7. 五条铁律合规确认

| # | 规则 | 合规 |
|---|------|------|
| 1 | controller 只发输入 | ✅ 无 playerIndex，server 注入 |
| 2 | server 分配并注入 playerIndex | ✅ socket.data.playerIndex |
| 3 | screen/Unity 负责游戏逻辑 | ✅ server 完全透传 game_message |
| 4 | Unity 广播状态 | ✅ BROADCAST 消息透传 |
| 5 | controller 更新 UI | ✅ controller 处理 score_update |

---

## 8. v0.2.x 路线图

| 版本 | 功能 | 状态 |
|------|------|------|
| v0.1.0 | 基础协议，6项硬性要求 | ✅ 固化 |
| v0.2.0 | quiz-game 模板，二维码入口 | ✅ 固化 |
| v0.2.1 | 房间关闭功能（room_closed） | ✅ 固化 |
| **v0.2.2** | **maxPlayers 管理，players 列表** | ✅ **本版本** |
| v0.2.3 | 断线重连（reconnectToken） | 🔜 下一个 |
| v0.2.4 | 心跳保活 | 🔜 待定 |
| v0.2.5 | Unity WebGL Template | 🔜 待定 |

---

## 9. 文件变更清单

| 文件 | 变更类型 |
|------|----------|
| `server/server.js` | 修改 |
| `screen/index.html` | 修改 |
| `controller/index.html` | 修改 |
