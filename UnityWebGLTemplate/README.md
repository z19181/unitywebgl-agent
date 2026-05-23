# PartyGameSDK Unity WebGL Template — v0.2.5

一键将 Unity 游戏接入 PartyGameSDK 多人框架的标准模板。

---

## 目录结构

```
UnityWebGLTemplate/
├── WebGLTemplates/
│   └── PartyGameTemplate/          # ← 拷到 Unity 项目的 Assets/WebGLTemplates/
│       ├── index.html              #    Unity WebGL 输出页（内置 screen 逻辑）
│       ├── partygame-template.js   #    PartyGameSDK 初始化脚本
│       └── TemplateData/           #    放 Unity 的 favicon/style 资源
├── Assets/
│   ├── Scripts/
│   │   └── Platform/
│   │       ├── PartyGameBridge.cs  #   双向通信桥（单例，挂 PartyGameBridge GameObject）
│   │       ├── PartyGameMessage.cs #   消息结构定义
│   │       └── PartyGameTypes.cs   #   消息类型常量
│   └── Plugins/
│       └── WebGL/
│           └── PartyGameBridge.jslib  # WebGL JS 插件
├── Web/
│   ├── controller.html             #   标准 controller 页面
│   ├── partygame-sdk.js            #   Web 客户端 SDK
│   └── controller-base.js          #   Controller 基础逻辑
└── README.md                       #   本文件
```

---

## 快速接入（5 分钟）

### 1. Unity 选择 WebGL Template

```bash
# 复制模板到 Unity 项目
cp -r UnityWebGLTemplate/WebGLTemplates/PartyGameTemplate \
     YourGameProject/Assets/WebGLTemplates/
```

然后：`File → Build Settings → Player Settings → Resolution and Presentation → WebGL Template → PartyGameTemplate`

### 2. 创建 PartyGameBridge GameObject

1. 在场景中新建空 GameObject，命名 **`PartyGameBridge`**（名称必须精确）
2. 拖入 `Assets/Scripts/Platform/PartyGameBridge.cs`
3. 确保 `Plugins/WebGL/PartyGameBridge.jslib` 在正确位置

### 3. GameManager 接收消息

```csharp
using UnityEngine;

public class MyGameManager : MonoBehaviour
{
    void Start()
    {
        // ★ 方式 A: 直接实现 OnPlatformMessage
        var bridge = PartyGameBridge.Instance;
        // 消息会自动路由到这里
    }

    // ★ 接收 server 转发的 game_message
    public void OnPlatformMessage(string json)
    {
        var msg = JsonUtility.FromJson<PartyGameMessage>(json);

        switch (msg.type)
        {
            case PartyGameTypes.INPUT_TAP:
                HandleTap(msg.playerIndex);      // ← playerIndex 由 server 注入
                break;
            case PartyGameTypes.INPUT_CHARGE_END:
                var data = msg.ParseData<InputChargeEndData>();
                HandleJump(msg.playerIndex, data.power);
                break;
            case PartyGameTypes.INPUT_MOVE:
                var move = msg.ParseData<InputMoveData>();
                HandleMove(msg.playerIndex, move.x);
                break;
        }
    }
}
```

### 4. Unity 广播状态

```csharp
using System.Collections.Generic;

// 广播分数
var bridge = PartyGameBridge.Instance;
void SendScores() {
    var scores = new Dictionary<int, int> {
        { 0, myScore },
        { 1, otherScore }
    };
    bridge.BroadcastScoreUpdate(scores);
}

// 广播游戏结束
void EndGame() {
    bridge.BroadcastGameOver(finalScore, winnerIndex);
}

// 通用广播
bridge.Broadcast("feedback.hit", JsonUtility.ToJson(new { playerIndex = 0 }));
```

### 5. 验证完整链路

```bash
# 1. 启动 server
cd PartyGameSDK-MVP
node server/server.js
# → Server running on http://localhost:3000

# 2. 打开 screen (Unity WebGL Build)
#    http://localhost:3000/screen

# 3. 打开 controller（扫码或输入 URL）
#    http://localhost:3000/controller?room=XXXXXX
#    或使用 Web/controller.html

# 4. 验证链路:
#    controller 点击 → server → screen/Unity → Unity 广播 → controller UI 更新
```

---

## 核心协议

### 消息流向

```
Controller            Server               Screen/Unity
   |                    |                      |
   |-- game_message -->|                      |
   |   {type, data}    |-- game_message --> | (注入 playerIndex)
   |                    |   {type, data,     |
   |                    |    playerIndex}    |
   |                    |                      |
   |                    |<-- broadcast -------|
   |                    |   {type, data}      |
   |<-- broadcast ------|                      |
   |   {type, data}    |                      |
```

### 五条铁律（不可违反）

| # | 规则 | 说明 |
|---|---|---|
| 1 | controller 只发输入 | `{event:"game_message", type:"input.xxx"}` — 无 `playerIndex` |
| 2 | server 注入 playerIndex | 从 `socket.data.playerIndex` 注入，忽略请求体 |
| 3 | screen 仅转发 | 收到 `game_message` → `SendMessage("PartyGameBridge","OnPlatformMessage",json)` |
| 4 | Unity 广播状态 | 通过 `PartyGameBridge.Broadcast()` |
| 5 | controller 只更新 UI | 不计算游戏逻辑，不伪造状态 |

---

## 输入类型

| Type | Controller 发送 | Unity 接收 |
|---|---|---|
| `input.tap` | `sendTap()` | `msg.type == "input.tap"` |
| `input.move` | `sendMove(x)` | `msg.ParseData<InputMoveData>().x` |
| `input.charge_start` | `sendChargeStart()` | `msg.type == "input.charge_start"` |
| `input.charge_end` | `sendChargeEnd(power)` | `msg.ParseData<InputChargeEndData>().power` |

## 状态广播类型

| Type | Unity 发出 | Controller 接收 |
|---|---|---|
| `state.score_update` | `bridge.BroadcastScoreUpdate(scores)` | `pg.on('state.score_update', fn)` |
| `state.game_over` | `bridge.BroadcastGameOver(score, winner)` | `pg.on('state.game_over', fn)` |
| `feedback.hit` | `bridge.Broadcast("feedback.hit", data)` | `pg.on('feedback.hit', fn)` |

---

## API 参考

### PartyGameBridge.cs (Unity)

```csharp
// 单例
PartyGameBridge.Instance

// 已解析消息事件
PartyGameBridge.Instance.OnMessageReceivedEvent
// .AddListener((PartyGameMessage msg) => { ... })

// 广播方法
void BroadcastScoreUpdate(Dictionary<int, int> scores)
void BroadcastGameOver(int finalScore, int winnerIndex)
void Broadcast(string type, string dataJson)
```

### PartyGameSDK.js (Web)

```javascript
const pg = new PartyGameSDK({ autoReconnect: true });

// 连接
pg.connect()                    // 自动尝试重连 (reconnectToken)
pg.join(roomId)                 // 加入房间
pg.closeRoom()                  // 关闭房间

// 输入 (不发送 playerIndex)
pg.sendInput('input.tap')
pg.sendInput('input.charge_end', { power: 0.8 })
pg.sendInput('input.move', { x: 0.5 })

// 事件
pg.on('room_joined', fn)
pg.on('reconnected', fn)
pg.on('players_changed', fn)
pg.on('state.score_update', fn)
pg.on('state.game_over', fn)
pg.on('room_closed', fn)

// 查询
pg.getPlayerIndex()
pg.getRoomId()
pg.getPlayers()
pg.isRoomOpen()
```

### Controller Helper (controller-base.js)

```javascript
// Init
ControllerInit({ gameName: 'MyGame' })

// Input helpers
sendTap()
sendMove(x)
sendChargeStart()
sendChargeEnd(power)

// UI elements (auto-populated)
// #status, #score, #playerInfo, #playersList, #inputArea
```

---

## 版本兼容性

| 功能 | 版本 | 状态 |
|---|---|---|
| 基础房间 (create/join) | v0.1.0 | ✅ |
| 消息转发 (game_message) | v0.1.0 | ✅ |
| 广播 (broadcast) | v0.1.0 | ✅ |
| QR Code / 关闭房间 | v0.2.1 | ✅ |
| maxPlayers / players.changed | v0.2.2 | ✅ |
| reconnectToken 重连 | v0.2.3 | ✅ |
| Unity WebGL Template | v0.2.5 | ✅ |

---

## 故障排查

| 问题 | 检查 |
|---|---|
| Unity 收不到消息 | GameObject 名称为 `PartyGameBridge`? `OnPlatformMessage` 方法存在? |
| Controller 收不到广播 | server 运行中? `broadcast` 的 `event` 字段是 `"broadcast"`? |
| 重连失败 | `reconnectToken` 过期 (>10s)? `localStorage` 被清? |
| WebGL 构建失败 | `.jslib` 在 `Assets/Plugins/WebGL/`? 平台设为 WebGL? |
| 编码乱码 | C# → JSON → JS 保持 UTF-8; `JsonUtility` 自动处理 |

---

**PartyGameSDK v0.2.5** — Build Once, Play Everywhere.
