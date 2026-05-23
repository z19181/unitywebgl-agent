# PartyGameSDK v0.2.3 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 平台升级 (v0.2.x 系列)  
**基调:** 通信韧性 — controller 短线后可在 10 秒内无感恢复，playerIndex 保持不变。

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.2.3 |
| **Git Tag** | `v0.2.3` |
| **Commit** | `06a2555` |
| **分支** | `platform/v0.2.3` (从 `platform/v0.2.2` 新建) |
| **基线** | v0.2.2 (commit `b73e8ca`) |
| **测试** | 30/30 PASS ✓ |

---

## 2. 新增能力

### 2.1 reconnectToken 重连机制

**问题:** controller 网络闪断/页面刷新后，playerIndex 丢失，需要重新加入 → 游戏体验中断。

**方案:** 每个 controller 在 `room_joined` 时获得一个 **reconnectToken** (32字节 hex)，server 在断开后保留该玩家 **10 秒**，期间可用 token 恢复连接并复用原 playerIndex。

**时序图:**
```
Controller                  Server                   Screen
    |                         |                        |
    |---- join_room -------->|                        |
    |<---- room_joined -----|  (含 reconnectToken)  |
    |                         |                        |
    |  ... 游戏进行中 ...    |                        |
    |                         |                        |
    |  [网络断开]           |                        |
    |                         |  handleDisconnect()    |
    |                         |  → 立即广播           |
    |                         |    player_left          |
    |                         |    players.changed     |
    |                         |  → 10s 倒计时开始    |
    |                         |                        |
    |---- reconnect -------->|  (10s 内)            |
    |<---- reconnected -----|                        |
    |                         |---- player_reconnected->|
    |                         |                        |
    |  [超过 10s]           |                        |
    |                         |  (倒计时结束)         |
    |                         |  → 删除 disconnected  |
    |                         |    控制器              |
    |                         |                        |
```

**协议扩展:**

| 消息类型 | 方向 | 说明 |
|---|---|---|
| `reconnect` | Controller → Server | 请求重连 `{ reconnectToken, roomId }` |
| `reconnected` | Server → Controller | 重连成功 `{ playerIndex, players }` |
| `reconnect_failed` | Server → Controller | 重连失败 `{ reason }` |
| `player_reconnected` | Server → Screen | 通知某玩家重连（可选） |

**存储策略:**
- Controller 端: `localStorage.setItem('reconnect_' + roomId, token)`
- Server 端: `room.disconnectedControllers` Map (token → { ws, playerIndex, timer })

---

## 3. playerIndex 策略

### 3.1 分配规则（继承 v0.2.2）

| 场景 | playerIndex 分配 |
|---|---|
| 首个 controller | 0 |
| 第二个 controller | 1 |
| 第三个 controller | 2 |
| ... | ... |
| 第 N 个 controller | N-1 |

### 3.2 重连规则（v0.2.3 新增）

| 场景 | playerIndex 行为 |
|---|---|
| 断开后 10s 内重连 | **复用**原 playerIndex |
| 超过 10s 后重连 | 失败 → 需重新 join_room → **新** playerIndex |
| 无效/过期 token | 失败 → 需重新 join_room → **新** playerIndex |

### 3.3 拦截规则（五条铁律）

✓ **铁律 1:** controller 发送的消息中 `playerIndex` 被忽略，server 从 `socket.data.playerIndex` 注入  
✓ **铁律 2:** server 统一分配 playerIndex，重连时复用  
✓ **铁律 3:** screen/Unity 仅转发，不计算 playerIndex  
✓ **铁律 4:** 重连成功后，Unity 收到 `player_reconnected` 事件  
✓ **铁律 5:** controller UI 根据 `reconnected` 消息更新 playerIndex 显示  

---

## 4. 保持不变的规则

### 4.1 五条铁律

✓ **铁律 1:** controller 只发输入，不发 playerIndex  
✓ **铁律 2:** server 分配并注入 playerIndex  
✓ **铁律 3:** screen 仅转发不计算  
✓ **铁律 4:** Unity 广播状态  
✓ **铁律 5:** controller 更新 UI  

### 4.2 协议透明性

✓ v0.2.3 **不新增** `game_message.type` 类型  
✓ `reconnect`/`reconnected`/`reconnect_failed` 是 **房间管理消息**，非游戏消息  
✓ 现有游戏无需修改即可获得重连能力（只需 controller 刷新页面）  

### 4.3 基线保护

✓ v0.1.0 tag (`2cc1d21`) 不可修改  
✓ v0.2.x 分支独立，不修改 v0.1.0 基线  
✓ 所有实验在 `platform/v0.2.x` 或 `game/xxx` 分支进行  

---

## 5. 测试结果

### 5.1 v0.2.1 基线回归（10 项）

| 测试 | 说明 | 结果 |
|---|---|---|
| T1 | create_room 返回 roomId | PASS ✓ |
| T2 | 首个 controller 获得 playerIndex=0 | PASS ✓ |
| T3 | server 注入 playerIndex=0 | PASS ✓ |
| T4 | FAKE playerIndex=999 被拦截 | PASS ✓ |
| T5 | 第二个 controller 获得 playerIndex=1 | PASS ✓ |
| T6 | score_update 广播到 controller | PASS ✓ |
| T7 | game_over 广播到 controller | PASS ✓ |
| T8 | room_created 返回 qrUrl | PASS ✓ |
| T9 | close_room 广播 room_closed | PASS ✓ |
| T10 | 关闭后 join_room 返回 room_not_found | PASS ✓ |

### 5.2 v0.2.2 回归测试（12 项）

| 测试 | 说明 | 结果 |
|---|---|---|
| B1 | 默认 maxPlayers=4 | PASS ✓ |
| B2 | maxPlayers=2 生效 | PASS ✓ |
| B3 | P0 加入后 players=[{0, P0}] | PASS ✓ |
| B4 | P1 加入后 players=[{0,P0},{1,P1}] | PASS ✓ |
| B5 | 满员后返回 room_full | PASS ✓ |
| B6 | 不重复分配 playerIndex | PASS ✓ |
| B7 | P0 发送 input.tap → server 注入 PI=0 | PASS ✓ |
| B8 | P1 发送 input.tap → server 注入 PI=1 | PASS ✓ |
| B9 | P0 断开 → screen 收到 player_left | PASS ✓ |
| B10 | P0 断开 → P1 收到 players.changed | PASS ✓ |
| B11 | P0 断开后 P1 仍可发送消息 | PASS ✓ |
| B12 | close_room → 所有 controllers 收到 room_closed | PASS ✓ |

### 5.3 v0.2.3 专项测试（8 项）

| 测试 | 说明 | 结果 |
|---|---|---|
| C1 | join_room 返回 reconnectToken (32字节) | PASS ✓ |
| C2 | 断开后 5s 内重连 → 成功（同 playerIndex） | PASS ✓ |
| C3 | 重连后 players 列表正确 | PASS ✓ |
| C4 | 断开后 10s 以上重连 → 失败（token 过期） | PASS ✓ |
| C5 | 无效 token 重连 → 失败 | PASS ✓ |
| C6 | 重连后发送消息 → playerIndex 正确 | PASS ✓ |
| C7 | 重连失败后重新加入 → 新 playerIndex | PASS ✓ |
| C8 | 重连期间其他玩家加入 → 正常 | PASS ✓ |

**总结:** 30/30 PASS ✓

---

## 6. 风险和后续

### 6.1 限制

| 限制 | 影响 | 缓解方案 |
|---|---|---|
| reconnectToken 仅保存在 localStorage | 换浏览器/清缓存后无法重连 | 用户需重新加入（获得新 PI） |
| 10s 窗口内 playerIndex 被占用 | 新玩家无法立即使用该 PI | 设计如此，保证重连体验 |
| 多个 controller 使用同一 token | 后一个重连会踢掉前一个 | Server 端 token 唯一，后一个失败 |

### 6.2 v0.2.4 规划（待定）

| 功能 | 优先级 | 说明 |
|---|---|---|
| 心跳检测 (Ping/Pong) | 中 | 检测"真·断开"（当前依赖 TCP 超时） |
| 房间自动销毁（无玩家时） | 中 | 防止僵尸房间 |
| Screen 断线重连 | 低 | 当前 screen 断开会销毁房间 |

### 6.3 v0.2.5 规划（已明确）

| 功能 | 状态 | 说明 |
|---|---|---|
| Unity WebGL Template | 待开发 | 一键发布 PartyGameSDK 兼容的 .html |



---

## 附录 A：协议消息格式

### A.1 reconnect（Controller → Server）

```json
{
  "event": "reconnect",
  "reconnectToken": "abc123...",
  "roomId": "A1B2C3"
}
```

### A.2 reconnected（Server → Controller）

```json
{
  "event": "reconnected",
  "playerIndex": 0,
  "playerName": "Player 0",
  "roomId": "A1B2C3",
  "players": [
    { "playerIndex": 0, "playerName": "Player 0" }
  ]
}
```

### A.3 reconnect_failed（Server → Controller）

```json
{
  "event": "reconnect_failed",
  "reason": "invalid or expired token"
}
```

### A.4 player_reconnected（Server → Screen，可选）

```json
{
  "event": "player_reconnected",
  "playerIndex": 0,
  "playerName": "Player 0",
  "playerCount": 1
}
```

---

## 附录 B：文件变更清单

| 文件 | 变更类型 | 行数变化 | 说明 |
|---|---|---|---|
| `server/server.js` | 修改 | +180 / -20 | 新增 reconnect 逻辑 |
| `controller/index.html` | 修改 | +120 / -10 | 新增重连 UI 逻辑 |
| `V0_2_3_RELEASE_REPORT.md` | 新增 | +290 | 本文件 |

**总计:** 2 个文件修改，1 个文件新增

---

**发布校验清单:**
- [x] 五条铁律未违反
- [x] 协议对 game_message.type 透明
- [x] v0.2.1 基线回归 10/10 PASS
- [x] v0.2.2 回归测试 12/12 PASS
- [x] v0.2.3 专项测试 8/8 PASS
- [x] Git tag `v0.2.3` 已打
- [x] 分支 `platform/v0.2.3` 已创建
- [x] 发布报告已生成

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
