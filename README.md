# PartyGameSDK MVP

> 多客户端 Unity WebGL 派对游戏架构：controller.html → server.js → screen.html → Unity

**版本**: v0.1.0  
**日期**: 2026-05-22  
**状态**: MVP 已验证通过（13/13 测试点 PASS）

---

## 架构

```
┌─────────────┐    game_message     ┌──────────┐    game_message    ┌─────────────┐    SendMessage    ┌───────────────┐
│ controller  │ ──────────────────→ │  server  │ ─────────────────→ │   screen    │ ────────────────→ │ Unity (WebGL) │
│  .html      │   (无playerIndex)  │  .js     │  (注入playerIndex) │   .html     │                   │  GameManager  │
└─────────────┘                     └──────────┘                    └─────────────┘                   └───────────────┘
                                           ↑                               ↑                               │
                                           │        broadcast               │     window.PartyGame           │
                                           │        state.score_update      │     Broadcast()               │
                                           │                               │                               │
                                    ┌─────────────┐                ┌─────────────┐    jslib           ┌───────────────┐
                                    │ controller  │ ←──────────── │   server    │ ←──────────────── │ Unity (WebGL) │
                                    │  .html      │   broadcast   │   .js       │   broadcast        │ PartyGame     │
                                    │ 分数 UI     │               │ 校验 role   │                    │ Bridge        │
                                    └─────────────┘               └─────────────┘                    └───────────────┘
```

### 职责划分

| 端 | 职责 | 禁止 |
|---|---|---|
| **controller.html** | 发送输入；接收 broadcast 更新 UI | ❌ 禁止发送 playerIndex；❌ 禁止计算分数 |
| **server.js** | 房间管理；分配 playerIndex；注入真实 playerIndex；转发；广播 | ❌ 禁止计算分数 |
| **screen.html** | 转发 game_message 到 Unity；转发 Unity broadcast 到 server | ❌ 禁止计算分数 |
| **Unity** | 处理输入；执行物理；计算分数；发起 broadcast | ❌ 禁止直接与 controller 通信 |

---

## 快速开始

### 1. 启动服务器

```bash
cd PartyGameSDK-MVP
npm install
npm start
```

### 2. 打开屏幕端

浏览器访问：`http://localhost:3000/screen`

- 页面会自动创建房间并显示 roomId
- 点击"复制控制器链接"获取 controller URL

### 3. 打开控制器

手机或另一浏览器打开：`http://localhost:3000/controller?room=ROOM_ID`

- 替换 ROOM_ID 为屏幕端显示的房间 ID
- 按住蓄力 → 松开跳跃

### 4. Unity WebGL 构建（可选）

1. 在 Unity 中打开项目（Assets/ 目录）
2. 菜单：**Tools → PartyGame → Create Jump Jump Demo Scene**
3. **File → Build Settings** → 选择 **WebGL** → **Build**
4. 输出到 `screen/Build/`
5. 刷新 screen 页面即可加载 Unity

### 5. 运行自动化测试

```bash
npm start  # 先启动服务器
node test_step10_auto.js  # 另一终端运行
```

---

## 安全机制

### playerIndex 不可伪造

```
controller 发送 game_message 时：
  1. 不含 playerIndex 字段（代码强制约束）
  2. 如果恶意夹带 playerIndex，server 删除它
  3. server 从 socket.data.playerIndex 注入真实值
  4. screen 收到的 playerIndex 始终由 server 分配
```

### broadcast 角色校验

```
screen 发送 broadcast 时：
  1. server 校验 ws.data.role === "screen"
  2. 非 screen 角色发送 broadcast 被拒绝
  3. server 广播给当前 room 所有 controllers
```

---

## 消息协议（摘要）

| 方向 | event | 说明 |
|------|-------|------|
| screen → server | `create_room` | 创建房间 |
| server → screen | `room_created` | 返回 roomId + qrUrl |
| controller → server | `join_room` | 加入房间（无 playerIndex） |
| server → controller | `room_joined` | 返回 roomId + playerIndex |
| server → screen | `player_joined` | 通知新玩家加入 |
| controller → server | `game_message` | 游戏输入（charge_start/end） |
| server → screen | `game_message` | 转发输入（含注入的 playerIndex） |
| screen → server | `broadcast` | Unity 广播（score_update/game_over） |
| server → controller | `broadcast` | 转发广播 |

完整协议见 [FINAL_SPEC.md](FINAL_SPEC.md)

---

## 文件结构

```
PartyGameSDK-MVP/
├── server/server.js                  # WebSocket 服务器
├── screen/index.html                  # 屏幕端
├── controller/index.html              # 控制器端
├── Assets/
│   ├── Editor/CreateJumpJumpScene.cs  # 一键生成场景
│   ├── Plugins/WebGL/PartyGameBridge.jslib
│   └── Scripts/
│       ├── Core/GameManager.cs + CameraFollow.cs
│       ├── Gameplay/PlayerJump.cs + PlatformSpawner.cs
│       ├── Platform/PartyGameBridge.cs + PartyGameMessage.cs
│       └── UI/UIManager.cs
├── test_step10_auto.js                # 自动化测试脚本
├── FINAL_SPEC.md                      # 协议规范
├── TEST_REPORT.md                     # 测试报告
├── CHANGELOG.md                       # 变更日志
└── README.md                          # 本文件
```

---

## v0.2 计划

| 优先级 | 特性 | 说明 |
|--------|------|------|
| P0 | Unity WebGL 真实构建验证 | 在真实 WebGL 环境中运行步骤 10 反向链路 |
| P0 | controller 重连机制 | WebSocket 断开后自动重连并恢复 playerIndex |
| P1 | playerIndex 回收 | 玩家离开后复用 playerIndex，避免无限增长 |
| P1 | 多房间压力测试 | 验证 10+ 房间同时运行 |
| P1 | 房间心跳 + 超时清理 | 空房间 30 分钟后自动清理 |
| P2 | HTTPS/WSS 支持 | 生产环境安全传输 |
| P2 | 房间密码 | 可选的房间加入密码 |
| P2 | 观众模式 | 只读连接，不分配 playerIndex |
| P3 | Redis 房间持久化 | 支持多进程/集群部署 |
| P3 | TypeScript 重写 | server.js → TypeScript，增加类型安全 |
| P3 | 新游戏 Demo | 基于 SDK 开发第二个游戏（如你画我猜） |
