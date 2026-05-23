# PartyGameSDK v0.1 — 最终协议规范

## 版本

- **版本号**: v0.1
- **日期**: 2026-05-22
- **代号**: JumpJump Demo MVP

---

## 一、架构总览

```
controller.html ──→ server.js ──→ screen.html ──→ Unity (WebGL)
     (输入)           (中转)         (转发)          (逻辑)

Unity (WebGL) ──→ screen.html ──→ server.js ──→ controller.html
     (状态)           (转发)         (广播)          (UI)
```

### 职责划分

| 端 | 职责 | 禁止 |
|---|---|---|
| **controller.html** | 发送输入（charge_start/charge_end）；接收 broadcast 更新 UI | ❌ 禁止发送 playerIndex；❌ 禁止计算分数；❌ 禁止处理游戏逻辑 |
| **server.js** | 房间管理；分配 playerIndex；注入真实 playerIndex；转发 game_message；广播 broadcast | ❌ 禁止计算分数；❌ 禁止处理游戏逻辑 |
| **screen.html** | 转发 game_message 到 Unity；转发 Unity broadcast 到 server；展示房间信息 | ❌ 禁止计算分数；❌ 禁止处理游戏逻辑 |
| **Unity (GameManager)** | 处理输入；执行跳跃物理；判定落地；计算分数；发起 broadcast | ❌ 禁止直接与 controller 通信 |

---

## 二、WebSocket 消息协议

### 2.1 房间管理

#### create_room

```json
// controller → server
{
  "event": "create_room"
}
```

```json
// server → screen
{
  "event": "room_created",
  "roomId": "F2E86C",
  "qrUrl": "http://localhost:3000/controller?room=F2E86C"
}
```

#### join_room

```json
// controller → server
{
  "event": "join_room",
  "roomId": "F2E86C"
}
```

⚠️ **controller 不允许发送 playerIndex**。如果发送了 playerIndex 字段，server 将忽略它。

```json
// server → controller
{
  "event": "room_joined",
  "roomId": "F2E86C",
  "playerIndex": 0,
  "playerName": "Player 0"
}
```

```json
// server → screen
{
  "event": "player_joined",
  "playerIndex": 0,
  "playerName": "Player 0",
  "playerCount": 1
}
```

```json
// server → controller (roomId 不存在)
{
  "event": "room_not_found",
  "roomId": "XXXXXX"
}
```

### 2.2 游戏消息（controller → server → screen → Unity）

#### game_message: input.charge_start

```json
// controller → server
{
  "event": "game_message",
  "type": "input.charge_start"
  // ⚠️ 无 playerIndex 字段 — 由 server 从 socket.data.playerIndex 注入
}

// server → screen（注入 playerIndex 后）
{
  "event": "game_message",
  "type": "input.charge_start",
  "playerIndex": 0
}
```

#### game_message: input.charge_end

```json
// controller → server
{
  "event": "game_message",
  "type": "input.charge_end",
  "data": {
    "power": 0.75
  }
  // ⚠️ 无 playerIndex 字段 — 由 server 从 socket.data.playerIndex 注入
}

// server → screen（注入 playerIndex 后）
{
  "event": "game_message",
  "type": "input.charge_end",
  "playerIndex": 0,
  "data": {
    "power": 0.75
  }
}
```

**server 注入逻辑（server.js）**：
```javascript
// 1. 如果客户端发送了 playerIndex，删除它
if (message.playerIndex !== undefined) {
  delete message.playerIndex;
}
// 2. 从 socket.data 注入真实的 playerIndex
message.playerIndex = ws.data.playerIndex;
```

### 2.3 广播消息（Unity → screen → server → controller）

#### broadcast: state.score_update

```json
// Unity → jslib → screen.html (window.PartyGameBroadcast)
{
  "eventType": "broadcast",
  "type": "state.score_update",
  "dataJson": "{\"scores\":\"{\\\"0\\\":1}\"}"
}

// screen.html → server（原样转发）
{
  "event": "broadcast",
  "type": "state.score_update",
  "data": {
    "scores": "{\"0\":1}"
  }
}

// server → 所有 controllers（原样广播）
{
  "event": "broadcast",
  "type": "state.score_update",
  "data": {
    "scores": "{\"0\":1}"
  }
}
```

**controller 分数解析（兼容数字/字符串 key）**：
```javascript
const scores = JSON.parse(data.scores);
const scoreValue = scores?.[playerIndex] ?? scores?.[String(playerIndex)] ?? 0;
```

#### broadcast: state.game_over

```json
{
  "event": "broadcast",
  "type": "state.game_over",
  "data": {
    "finalScore": 5,
    "winnerIndex": 0
  }
}
```

### 2.4 断开连接

```json
// server → screen
{
  "event": "player_left",
  "playerIndex": 0,
  "playerCount": 0
}

// server → controllers (screen 断开时)
{
  "event": "room_destroyed",
  "roomId": "F2E86C"
}
```

### 2.5 错误消息

```json
{
  "event": "error",
  "message": "Only controllers can send game_message"
}
```

---

## 三、数据模型

### 3.1 Room

```
Room {
  roomId: string          // 6位随机十六进制大写
  screenSocket: WebSocket // screen 的 WebSocket 连接
  controllers: Map<WebSocket, { playerIndex, playerName }>  // controller 列表
  nextPlayerIndex: number // 下一个分配的 playerIndex（从 0 开始）
}
```

### 3.2 socket.data

```
socket.data = {
  role: "screen" | "controller",  // 角色
  roomId: string,                  // 所在房间
  playerIndex: number              // 仅 controller 有，由 server 分配
}
```

---

## 四、安全规则

### 4.1 playerIndex 不可伪造

- **controller 不能发送 playerIndex**：如果 game_message 包含 playerIndex 字段，server 将删除它
- **server 从 socket.data.playerIndex 注入**：真实的 playerIndex 存储在 WebSocket 连接的服务端数据中
- **playerIndex 由 server 分配**：controller 加入房间时由 nextPlayerIndex++ 生成

### 4.2 broadcast 只能由 screen 发起

- server 校验 `ws.data.role === "screen"`
- 非 screen 角色发送 broadcast 将收到错误消息

### 4.3 game_message 只能由 controller 发送

- server 校验 `ws.data.role === "controller"`
- 非 controller 角色发送 game_message 将收到错误消息

---

## 五、Unity 侧协议

### 5.1 PartyGameBridge（双向通信桥）

| 方法 | 方向 | 说明 |
|------|------|------|
| `OnMessageReceived(string json)` | JS → Unity | 接收来自 screen 的消息 |
| `BroadcastMessage(string type, object data)` | Unity → JS | 发送广播到所有 controller |
| `BroadcastScoreUpdate(Dictionary<int,int> scores)` | Unity → JS | 广播分数更新 |
| `BroadcastGameOver(int score, int winnerIndex)` | Unity → JS | 广播游戏结束 |

### 5.2 PartyGameBridge.jslib（WebGL 插件）

| 函数 | 方向 | 说明 |
|------|------|------|
| `SendToJavaScript(string json)` | Unity → JS | 调用 `window.PartyGameBroadcast(json)` |
| `PG_SendMessage(string json)` | JS → Unity | 调用 `unityInstance.SendMessage('PartyGameBridge', 'OnMessageReceived', json)` |

### 5.3 平台区分

| 模式 | 行为 |
|------|------|
| **WebGL** | 走 jslib，调用 `window.PartyGameBroadcast()` |
| **Editor** | 仅 `Debug.Log("[Editor Mode] Mock Broadcast: ...")` |

### 5.4 GameManager 消息处理

| 接收消息类型 | 处理方法 | 说明 |
|---|---|---|
| `input.charge_start` | `HandleChargeStart(playerIndex)` | 记录玩家开始蓄力 |
| `input.charge_end` | `HandleChargeEnd(playerIndex, power)` | 执行跳跃物理 |
| 玩家落地 | `OnPlayerLanded(playerIndex)` | 加分 + 调用 `BroadcastScoreUpdate()` |

---

## 六、文件清单

```
PartyGameSDK-MVP/
├── server/
│   └── server.js                    # WebSocket 服务器（房间管理 + 消息转发）
├── screen/
│   └── index.html                   # 屏幕端（加载 Unity + 转发消息）
├── controller/
│   └── index.html                   # 控制器端（输入 + 分数 UI）
├── Assets/
│   ├── Editor/
│   │   └── CreateJumpJumpScene.cs   # Unity Editor 一键生成场景
│   ├── Plugins/WebGL/
│   │   └── PartyGameBridge.jslib    # Unity ↔ JS 双向通信插件
│   └── Scripts/
│       ├── Core/
│       │   ├── GameManager.cs       # 游戏管理器（输入处理 + 分数 + 广播）
│       │   └── CameraFollow.cs      # 相机跟随
│       ├── Gameplay/
│       │   ├── PlayerJump.cs        # 玩家跳跃控制器
│       │   └── PlatformSpawner.cs   # 平台生成器
│       ├── Platform/
│       │   ├── PartyGameBridge.cs   # Unity ↔ JS 桥接器
│       │   └── PartyGameMessage.cs  # 消息类型定义
│       └── UI/
│           └── UIManager.cs         # UI 管理器
├── package.json
├── FINAL_SPEC.md                    # 本文件
├── TEST_REPORT.md
├── CHANGELOG.md
└── README.md
```
