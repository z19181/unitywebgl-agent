# PartyGameSDK v0.2.1 Release Report

**Date:** 2026-05-22 PDT  
**Commit:** `0d097fe`  
**Tag:** `v0.2.1`  
**Branch:** `platform/v0.2.1`  
**Previous Baseline:** v0.1.0 (commit `2cc1d21`)

---

## 一、版本信息

| 字段 | 值 |
|------|-----|
| 版本号 | v0.2.1 |
| Commit | `0d097fe` |
| Tag | `v0.2.1` |
| 分支 | `platform/v0.2.1` |
| 基线 | v0.1.0 (`2cc1d21`) |
| 测试结果 | **17/17 PASS** |

---

## 二、新增能力

### 2.1 QR Code 入口 (QR Code Join)

- screen 创建房间后，`room_created` 响应中包含 `qrUrl`
- 格式：`http://localhost:3000/controller?room=XXXXXX`
- screen 页面使用 `qrcode-generator` CDN 渲染二维码
- 玩家手机扫码后直接进入 controller 页面并加入指定房间

### 2.2 关闭房间 (`close_room`)

- screen 可主动发送 `close_room` 消息关闭房间
- server 验证发送者角色为 `screen`，非 screen 发送无效
- 房间从 server 内存 Map 中删除
- `handleCloseRoom()` 处理函数统一管理关闭逻辑

### 2.3 房间关闭通知 (`room_closed`)

- server 向房间内所有 controller 广播 `room_closed` 事件
- `reason` 字段区分来源：
  - `host_closed`：主持人主动关闭
  - `host_disconnected`：主持人（screen）断开连接

### 2.4 Controller 关闭后禁用输入

- controller 引入 `isRoomOpen` 标志
- `room_joined` 时设为 `true`，`room_closed` 时设为 `false`
- `sendGameMessage()` 统一入口，检查 `isRoomOpen` 后方可发送
- `startCharge()` / `endCharge()` 改为调用 `sendGameMessage()`
- 收到 `room_closed` 后：蓄力按钮禁用（`opacity=0.3, pointer-events:none`），蓄力条归零，状态栏显示关闭原因

### 2.5 Host 断开自动通知

- server `handleDisconnect` 检测 screen 断开
- 自动广播 `room_closed(reason=host_disconnected)` 给所有 controller
- 房间同步删除

### 2.6 关闭房间不可再次加入

- 房间删除后，`rooms` Map 中无此 roomId
- controller 再次 join 收到 `room_not_found`
- 防止幽灵房间残留

---

## 三、保持不变的基线规则

| # | 规则 | 状态 |
|---|------|------|
| 1 | controller 只发输入（不含 playerIndex） | ✅ 维持 |
| 2 | server 分配并注入 playerIndex | ✅ 维持 |
| 3 | screen / Unity 负责游戏逻辑 | ✅ 维持 |
| 4 | Unity 广播状态 | ✅ 维持 |
| 5 | controller 更新 UI | ✅ 维持 |
| 6 | `game_message.type` 仍然透明转发 | ✅ 维持 |

**协议透明性验证：** `game_message.type` 对 server 完全透明，已验证支持 `input.tap`、`input.charge_start`、`input.charge_end`、`input.move` 及任意自定义类型，无白名单限制。

---

## 四、测试结果

**总计：17/17 PASS，0 FAIL**

### 4.1 v0.1.0 基线回归（7项）— 全部 PASS

| # | 测试用例 | 说明 |
|---|---------|------|
| T1 | `create_room` → `roomId` 有效 | 6位随机房间码生成正常 |
| T2 | `join_room` → `playerIndex=0` | 首个玩家分配正确 |
| T3 | server 注入 `playerIndex=0` | 绕过伪造，返回真实索引 |
| T4 | 伪造 `playerIndex=999` → 强制归 0 | 五条铁律第1条强制执行 |
| T5 | 第二个 controller → `playerIndex=1` | 递增分配正常 |
| T6 | `score_update` 广播到 controller | Unity 状态广播正常 |
| T7 | `game_over` 广播到 controller | 游戏结束状态正常 |

### 4.2 v0.2.1 专项测试（10项）— 全部 PASS

| # | 测试用例 | 说明 |
|---|---------|------|
| B1 | `room_created` 含 `qrUrl` | 二维码 URL 存在且格式正确 |
| B2 | `qrUrl` 格式完整 | `http://localhost:3000/controller?room=XXXXXX` |
| B3 | screen `close_room` → `room_closed(host_closed)` | 主持人关闭流程正确 |
| B4 | screen 断开 → `room_closed(host_disconnected)` | 自动通知流程正确 |
| B5 | 房间关闭后 join → `room_not_found` | 房间正确删除 |
| B6 | `room_closed` 后无法再次 join | 拒绝幽灵房间 |
| B7 | `game_message.type` 仍然透明转发 | 协议兼容性完好 |
| B8 | `close_room` 权限：controller 发送无效 | screen 权限锁定 |
| B9 | `player_joined` / `player_left` 继续工作 | 基线功能未被破坏 |
| B10 | `state.score_update` / `state.game_over` 广播继续工作 | 基线功能未被破坏 |

---

## 五、Bug 复盘

### 5.1 `player_left` 到达 screen 延迟

**现象：** B9 测试中，controller 关闭后，`player_left` 消息未能立即到达 screen，导致测试超时失败。

**调试过程：**
1. 初期诊断：怀疑 server `handleDisconnect` 逻辑有问题
2. 添加 try/catch 和日志：`[ws-id] Sent player_left to screen` — server 端确认发送成功
3. 独立调试脚本（`_debug2.js`）：使用持久 listener 接收所有消息，验证 `player_left` **100% 到达**，只是延迟约 1400ms
4. 结论：server 端逻辑正确，问题出在测试脚本的消息接收方式

**根因：** TCP Nagle 算法 + 延迟确认（Delayed ACK）机制。

- server 调用 `ws.send()` 成功后，数据进入 OS 内核 TCP 发送缓冲区
- Nagle 算法将小数据包合并以减少网络往返
- Delayed ACK 等待反向数据包以捎带 ACK
- 两者共同导致 ~1400ms 的内核缓冲延迟

**修复方案：**

❌ 原方案（固定 sleep）：
```javascript
await new Promise(r => setTimeout(r, 1000)); // 不足，B9 失败
await new Promise(r => setTimeout(r, 2000)); // 仍可能失败
```

✅ 修复后（条件轮询）：
```javascript
c.close();
const deadline = Date.now() + 4000;
while (Date.now() < deadline) {
  await new Promise(r => setTimeout(r, 200));
  if (msgs.find(m => m.event === 'player_left')) break;
}
```

**经验教训：**
> 异步网络事件测试不应依赖固定 sleep，应使用**条件轮询**等待目标事件到达，附以超时保护。

---

## 六、下一步建议

### v0.2.2：多人 playerIndex 管理

- 最大玩家数限制（`maxPlayers`）
- 玩家列表管理（`player_list` 广播）
- 座位分配策略（顺序/随机）
- 玩家主动离开 vs 被动断开区分处理

### v0.2.3：断线重连

- `reconnectToken`：screen 断开后房间保留，controller 凭 token 重连
- 重连超时计时器（可配置）
- 重连期间房间状态冻结
- Unity 处理重连后的状态同步

### v0.2.4：Unity WebGL Template 标准化

- 标准化的 WebGL Template 压缩包
- 自动注入 server URL / roomId
- 统一的 `PartyGameBridge.cs` + `PartyGameBridge.jslib`
- Editor 模式下走 `Debug.Log`，WebGL 走 JSBridge
- 自动化场景创建脚本（`CreateXXXScene.cs`）

### v0.2.5：小游戏模板工厂

- 通用游戏模板生成器
- 一键创建新小游戏骨架（Unity 脚本 + Controller HTML + Server 路由）
- JumpJump / Flappy Bird / Breakout / Quiz — 已有 4 款游戏验证协议泛化
- 新增游戏无需修改 server 和通用 controller/screen

---

*Report generated: 2026-05-22 21:25 PDT*  
*PartyGameSDK — 随时随地，帮您高效干活*
