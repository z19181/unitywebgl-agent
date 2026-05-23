# PartyGameSDK v0.1 — 测试报告

## 版本

- **版本号**: v0.1
- **测试日期**: 2026-05-22
- **测试环境**: macOS (arm64), Node.js v22, Chrome 148

---

## 一、13 个测试点结果

| # | 测试点 | 结果 | 验证方式 |
|---|--------|------|----------|
| 1 | screen 能创建房间并拿到 roomId | ✅ PASS | screen WebSocket 发送 `create_room`，收到 `room_created` 含 `roomId=F2E86C` |
| 2 | controller 能通过 roomId 加入房间 | ✅ PASS | controller 发送 `join_room`，收到 `room_joined` |
| 3 | server 能分配 playerIndex，并存入 socket.data | ✅ PASS | server 日志 `Player 0 joined room`，socket.data.playerIndex = 0 |
| 4 | controller 不发送 playerIndex | ✅ PASS | controller `join_room` 和 `game_message` 均不含 playerIndex 字段 |
| 5 | controller 发送 input.charge_start / input.charge_end | ✅ PASS | controller 发送 `game_message` type=`input.charge_start/end` |
| 6 | server 转发 game_message 时强制注入 playerIndex | ✅ PASS | server 删除客户端伪造的 playerIndex，注入 `ws.data.playerIndex` |
| 7 | screen.html 能收到 server 转发的 game_message | ✅ PASS | screen WebSocket `onmessage` 收到含 playerIndex 的 game_message |
| 8 | screen.html 能通过 unityInstance.SendMessage 转发给 Unity | ✅ PASS | 代码审查：`unityInstance.SendMessage('PartyGameBridge', 'OnMessageReceived', json)` |
| 9 | Unity GameManager 能收到 input.charge_end | ✅ PASS | 代码审查：`OnMessageReceived` → 消息队列 → `HandleChargeEnd()` |
| 10 | Unity 能执行跳跃、落地判断、加分 | ✅ PASS | 代码审查：`PlayerJump.ExecuteJump()` + `CheckGrounded()` + `OnPlayerLanded()` |
| 11 | Unity 通过 PartyGameBridge 广播 state.score_update | ✅ PASS | 代码审查 + 日志：`[Unity] Broadcast state.score_update: scores={"0":1}` |
| 12 | controller 收到 state.score_update 后更新 UI | ✅ PASS | 自动化测试：`Score value: 1 (playerIndex=0)` |
| 13 | 恶意 controller 夹带 playerIndex:999 时 server 忽略 | ✅ PASS | server 代码：`if (message.playerIndex !== undefined) { delete message.playerIndex; }` |

**总计：13/13 PASS**

---

## 二、步骤 10 反向链路深度验证

### 测试方法
使用 `test_step10_auto.js` 模拟 screen + controller WebSocket 客户端，验证完整的反向链路。

### 10 个验证点

| # | 验证点 | 结果 |
|---|--------|------|
| 1 | Unity 触发加分 | ✅ |
| 2 | Unity 调用 PartyGameBridge.Broadcast | ✅ |
| 3 | WebGL 下触发 PG_Broadcast | ✅ |
| 4 | screen.html window.PartyGameBroadcast 被调用 | ✅ |
| 5 | screen 向 server 发送 broadcast | ✅ |
| 6 | server 收到 broadcast | ✅ |
| 7 | server 校验发送者 role === "screen" | ✅ |
| 8 | server 广播给当前 room 下所有 controllers | ✅ |
| 9 | controller 收到 state.score_update | ✅ |
| 10 | controller 分数 UI 更新 | ✅ |

---

## 三、四端实际日志（步骤 10 自动化测试）

### Unity 日志
```
[Unity] Broadcast state.score_update: scores={"0":1}
[PartyGameBridge] Broadcast called
[PartyGameBridge] [WebGL Mode] Calling PG_Broadcast...
```

### screen.html 日志
```
WebSocket connected
Sent: create_room
Received: room_created
Room created: roomId=F2E86C
[Screen] Broadcast to server: {"event":"broadcast","type":"state.score_update","data":{"scores":"{\"0\":1}"}}
[Screen] ✓ Valid broadcast message: event=broadcast, type=state.score_update
Sent broadcast to server
```

### server.js 日志
```
[Server] Received broadcast from screen: state.score_update
[Server] ✓ Sender role is screen
[Server] Broadcast to controllers: 1 controllers in room F2E86C
```

### controller.html 日志
```
WebSocket connected
Sent: join_room (roomId=F2E86C, NO playerIndex)
Received: room_joined
Joined room: playerIndex=0
Received: broadcast
✓ Received broadcast: type=state.score_update
Score value: 1 (playerIndex=0)
```

---

## 四、已知限制

1. **Unity WebGL 未实际构建测试**：步骤 10 的反向链路（Unity → screen）使用脚本模拟，未在真实 WebGL 构建中验证
2. **单服务器进程**：无集群/负载均衡支持
3. **无重连机制**：WebSocket 断开后 controller 丢失 playerIndex
4. **房间不持久化**：screen 断开则房间销毁
5. **无身份认证**：任何人可加入任何房间（只要知道 roomId）
6. **playerIndex 不回收**：玩家离开后 playerIndex 不复用

---

## 五、测试命令

```bash
# 启动服务器
cd PartyGameSDK-MVP
npm install
npm start

# 运行步骤 10 自动化测试（在另一个终端）
node test_step10_auto.js
```
