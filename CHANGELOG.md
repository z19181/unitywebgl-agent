# PartyGameSDK — 变更日志

## v0.1.0 (2026-05-22)

### 首次发布 — JumpJump Demo MVP

#### 新增

**服务器 (server/)**
- WebSocket 服务器（Express + ws）
- 房间管理：create_room / join_room / room_joined / player_joined / player_left
- game_message 转发：controller → server → screen，server 强制注入 playerIndex
- broadcast 广播：screen → server → 所有 controllers，校验发送者 role
- 6位随机 roomId 生成
- screen 断开自动销毁房间
- controller 断开自动通知 screen

**屏幕端 (screen/)**
- Unity WebGL 加载与实例化
- create_room 调用与 roomId 展示
- 控制器链接复制
- 玩家列表实时更新
- game_message 转发至 Unity（unityInstance.SendMessage）
- window.PartyGameBroadcast 接收 Unity 广播并转发至 server
- 加载遮罩与状态栏

**控制器端 (controller/)**
- URL 参数读取 roomId
- join_room 调用（不发送 playerIndex）
- playerIndex 显示
- 蓄力按钮（touchstart/touchend + mousedown/mouseup）
- input.charge_start / input.charge_end 发送
- broadcast 接收与分数 UI 更新
- 兼容数字/字符串 key 的分数解析

**Unity 脚本 (Assets/)**
- PartyGameBridge.cs：Unity ↔ JS 双向通信桥（WebGL 走 jslib，Editor 走 Mock）
- PartyGameBridge.jslib：WebGL 通信插件（PG_Broadcast / PG_SendMessage）
- PartyGameMessage.cs：消息类型常量定义
- GameManager.cs：游戏管理器（输入处理 + 分数计算 + 广播发起）
- PlayerJump.cs：玩家跳跃控制器（物理跳跃 + 落地检测）
- PlatformSpawner.cs：平台生成器
- CameraFollow.cs：相机跟随
- UIManager.cs：UI 管理器
- CreateJumpJumpScene.cs：Editor 一键生成跳一跳场景

#### 安全特性

- **controller 不允许发送 playerIndex**：server 删除客户端伪造的 playerIndex，从 socket.data 注入真实值
- **broadcast 只能由 screen 发起**：server 校验 ws.data.role === "screen"
- **game_message 只能由 controller 发送**：server 校验 ws.data.role === "controller"

#### 修复

- 修复 scores key 数字/字符串不兼容问题：controller 使用 `scores?.[playerIndex] ?? scores?.[String(playerIndex)] ?? 0`
- 修复 playerIndex 类型不一致问题：controller 使用 `Number(message.playerIndex)` 确保数字类型

#### 已知限制

- Unity WebGL 未实际构建验证（反向链路用脚本模拟）
- 无重连机制
- 房间不持久化
- 无身份认证
- playerIndex 不回收
