# PartyGameSDK - Unity WebGL 跳一跳 Demo 配置指南

## 📂 项目结构

```
PartyGameSDK-MVP/
├── Assets/
│   ├── Scripts/
│   │   ├── Platform/
│   │   │   ├── PartyGameMessage.cs
│   │   │   └── PartyGameBridge.cs
│   │   ├── Core/
│   │   │   └── GameManager.cs
│   │   ├── Gameplay/
│   │   │   ├── PlayerJump.cs
│   │   │   └── PlatformSpawner.cs
│   │   └── UI/
│   │       └── UIManager.cs
│   └── Plugins/
│       └── WebGL/
│           └── PartyGameBridge.jslib
├── screen/
│   └── index.html
├── controller/
│   └── index.html
├── server/
│   └── server.js
├── package.json
└── README.md
```

---

## 🎮 Unity 场景层级

### 推荐层级结构

```
Scene: JumpGame
│
├── GameManager (空 GameObject)
│   └── GameManager.cs
│
├── PartyGameBridge (空 GameObject)
│   └── PartyGameBridge.cs
│
├── UIManager (空 GameObject)
│   └── UIManager.cs
│
├── PlatformSpawner (空 GameObject)
│   └── PlatformSpawner.cs
│
├── PlayerSpawnPoint (空 GameObject, 位置: 0, 1, 0)
│
├── Platforms (空 GameObject - 组织用)
│   └── Platform_0
│   └── Platform_1
│   └── ...
│
├── Players (空 GameObject - 组织用)
│   └── Player_0
│   └── Player_1
│   └── ...
│
├── Environment (空 GameObject - 组织用)
│   ├── Ground (地面)
│   ├── DeathZone (掉落检测区域)
│   └── Lighting (光照)
│
└── UI (Unity UI Canvas)
    ├── ScorePanel
    │   ├── Player0_ScoreText
    │   ├── Player1_ScoreText
    │   └── ...
    └── GameOverPanel (默认隐藏)
        ├── FinalScoreText
        └── WinnerText
```

---

## 📝 脚本挂载和 Inspector 参数

### 1. GameManager.cs

**挂载到:** `GameManager` GameObject

**Inspector 参数:**
```
Game Manager (Script)
├── Game Settings
│   ├── Max Players: 4
│   ├── Platform Distance Range
│   │   ├── X: 3
│   │   └── Y: 6
│   └── Jump Force Range
│       ├── X: 5   (0% 蓄力)
│       └── Y: 15  (100% 蓄力)
│
└── References
    ├── Player Prefab: [拖入 Player 预制体]
    ├── Platform Prefab: [拖入 Platform 预制体]
    └── Player Spawn Point: [拖入 PlayerSpawnPoint]
```

---

### 2. PartyGameBridge.cs

**挂载到:** `PartyGameBridge` GameObject

**Inspector 参数:**
```
Party Game Bridge (Script)
└── Debug
    └── Enable Debug Log: ☑ (勾选以启用调试日志)
```

**注意:** 此脚本会自动创建单例，并确保跨场景持久化。

---

### 3. PlayerJump.cs (PlayerController)

**挂载到:** `Player` 预制体

**Inspector 参数:**
```
Player Controller (Script)
├── Jump Settings
│   ├── Charge Animation Speed: 2.0
│   ├── Base Jump Force: 10.0
│   └── Player Color: (自动根据 playerIndex 设置)
│
└── References
    └── Player Renderer: [拖入子对象的 Renderer]
```

**必要组件:**
- ✅ Rigidbody
- ✅ Collider (Box Collider 或 Sphere Collider)
- ✅ PlayerController.cs

**Rigidbody 设置:**
```
Mass: 1
Drag: 0
Angular Drag: 0.05
Use Gravity: ☑
Is Kinematic: ☐
Constraints:
  - Freeze Rotation (X, Y, Z)
  - Freeze Position (Z)
```

---

### 4. PlatformSpawner.cs

**挂载到:** `PlatformSpawner` GameObject

**Inspector 参数:**
```
Platform Spawner (Script)
├── Spawn Settings
│   ├── Platform Prefab: [拖入 Platform 预制体]
│   ├── Initial Platform Count: 5
│   ├── Distance Range
│   │   ├── X: 3
│   │   └── Y: 6
│   ├── Platform Width: 2.0
│   └── Randomize Size: ☑
│
└── References
    └── Player Transform: [拖入 Player 的 Transform]
```

---

### 5. UIManager.cs

**挂载到:** `UIManager` GameObject

**Inspector 参数:**
```
UI Manager (Script)
├── UI References
│   ├── Score Texts: (Size: 4)
│   │   ├── Element 0: [拖入 Player0_ScoreText]
│   │   ├── Element 1: [拖入 Player1_ScoreText]
│   │   ├── Element 2: [拖入 Player2_ScoreText]
│   │   └── Element 3: [拖入 Player3_ScoreText]
│   ├── Player Name Texts: (Size: 4)
│   │   └── [可选 - 用于显示玩家名称]
│   ├── Game Over Panel: [拖入 GameOverPanel]
│   ├── Final Score Text: [拖入 FinalScoreText]
│   └── Winner Text: [拖入 WinnerText]
│
└── Settings
    └── Max Players: 4
```

---

## ⚙️ WebGL Build Settings

### 1. 打开 Build Settings

`File` → `Build Settings`

### 2. 切换到 WebGL 平台

- 点击 `Platform` 列表中的 `WebGL`
- 点击 `Switch Platform`

### 3. Player Settings

点击 `Player Settings` 按钮，或 `Edit` → `Project Settings` → `Player`

#### Player Settings 配置:

**Resolution and Presentation:**
```
Resolution and Presentation
├── Default Canvas Width: 960
├── Default Canvas Height: 600
├── Run In Background: ☑
└── WebGL Template: Default
```

**Other Settings:**
```
Other Settings
├── Configuration
│   ├── Scripting Backend: IL2CPP (推荐) 或 Mono
│   ├── API Compatibility Level: .NET Standard 2.1
│   └── Player Data Caching: ☑ (启用以加快加载)
│
├── Optimization
│   ├── Prebake Collision Meshes: ☑
│   └── Keep Loaded Shaders Alive: ☑
│
└── Publishing Settings
    ├── Compression Format: Brotli (最佳压缩) 或 Disabled
    └── Name Files As Assets: ☐
```

**Publishing Settings:**
```
Publishing Settings
├── Compression Format: Brotli
├── Enable Exceptions: Explicitly Thrown Exceptions Only (开发时可用 Full)
└── WebAssembly Arithmetic Exceptions: ☑
```

### 4. 构建

- 返回 `Build Settings`
- 点击 `Build`
- 选择输出目录（例如：`Build` 文件夹）
- 等待构建完成

### 5. 构建输出

构建完成后，会生成以下文件:

```
Build/
├── Build.data
├── Build.framework.js
├── Build.wasm
├── Build.loader.js
└── index.html (可选 - 我们会用自定义的 screen.html)
```

**重要:** 将构建输出放在 `screen/` 目录下，或修改 `screen.html` 中的 `CONFIG.unityBuildUrl` 指向正确的路径。

---

## 🚀 本地联调步骤

### 步骤 1: 启动服务器

```bash
cd PartyGameSDK-MVP
npm install
npm start
```

服务器将在 `http://localhost:3000` 启动。

### 步骤 2: 构建 Unity WebGL

按照上面的 **WebGL Build Settings** 章节构建 Unity 项目。

将构建输出放到 `screen/` 目录下，例如:

```
screen/
├── Build/
│   ├── Build.data
│   ├── Build.framework.js
│   ├── Build.wasm
│   └── Build.loader.js
└── index.html
```

**或修改 `screen/index.html` 中的配置:**

```javascript
const CONFIG = {
  serverUrl: `ws://${window.location.host}`,
  unityBuildUrl: 'Build',  // 指向 Build 目录
  unityLoaderUrl: 'Build/Build.loader.js',  // 指向 loader 脚本
  enableDebugLog: true
};
```

### 步骤 3: 打开屏幕端

浏览器访问: http://localhost:3000/screen

- 等待 Unity 加载完成
- 状态栏显示 "🟢 已连接到服务器"

### 步骤 4: 打开控制器端

**方式 1: 同一台电脑（新标签页）**

浏览器访问: http://localhost:3000/controller

**方式 2: 手机（同一网络）**

1. 查找电脑的局域网 IP（例如：`192.168.1.100`）
2. 手机浏览器访问: `http://192.168.1.100:3000/controller`
3. 确保防火墙允许端口 3000

### 步骤 5: 测试游戏

1. 控制器页面会自动加入游戏
2. 屏幕端显示玩家
3. 在控制器上按住按钮蓄力
4. 松开按钮跳跃
5. 观察屏幕端玩家跳跃
6. 成功着陆后分数更新

---

## ✅ 验收测试步骤

### 测试 1: 正常游戏流程

**步骤:**
1. 打开屏幕端 (`/screen`)
2. 打开 2 个控制器 (`/controller`)
3. 两个控制器都成功加入（分配不同 `playerIndex`）
4. 屏幕端显示 2 个玩家
5. 控制器 A 按住按钮蓄力，松开跳跃
6. 屏幕端玩家 A 跳跃
7. 成功着陆后，两个控制器都收到分数更新
8. 重复步骤 5-7 多次，分数正确累加

**预期结果:** ✅ 所有步骤正常

---

### 测试 2: playerIndex 防伪造

**步骤:**
1. 打开控制器页面
2. 打开浏览器开发者工具 (F12)
3. 在控制台输入:

```javascript
// 尝试伪造 playerIndex
ws.send(JSON.stringify({
  type: 'controller_join',
  playerName: 'Hacker',
  playerIndex: 999  // 尝试伪造
}));
```

**预期结果:** ❌ 服务器返回 `player_rejected` 消息，拒绝加入

---

### 测试 3: 输入消息 playerIndex 验证

**步骤:**
1. 正常加入游戏，获得 `playerIndex = 0`
2. 打开浏览器开发者工具
3. 在控制台输入:

```javascript
// 尝试伪造其他玩家的输入
ws.send(JSON.stringify({
  event: 'game_message',
  type: 'input.charge_end',
  data: {
    power: 1.0
  }
  // 不发送 playerIndex - 由服务器注入
}));
```

4. 观察屏幕端，应该是 `playerIndex = 0` 的玩家跳跃

**预期结果:** ✅ 屏幕端只显示 `playerIndex = 0` 的玩家跳跃（服务器注入的 `playerIndex`）

---

### 测试 4: 多控制器同时游戏

**步骤:**
1. 打开 4 个控制器（不同浏览器标签或设备）
2. 所有控制器成功加入，分配 `playerIndex` 0-3
3. 4 个玩家同时游戏
4. 各自操作自己的控制器
5. 观察屏幕端，每个玩家的跳跃独立

**预期结果:** ✅ 4 个玩家独立操作，互不影响

---

### 测试 5: 控制器断开重连

**步骤:**
1. 控制器加入游戏（`playerIndex = 0`）
2. 关闭控制器页面（模拟断开）
3. 屏幕端收到 `player_left` 消息
4. 重新打开控制器页面
5. 分配新的 `playerIndex`（例如 `1`）

**预期结果:** ✅ 断开后重连获得新 `playerIndex`，旧玩家从屏幕端移除

---

### 测试 6: 触摸和鼠标同时支持

**步骤:**
1. 在手机上打开控制器（触摸）
2. 按住按钮蓄力，松开跳跃
3. 在电脑上打开控制器（鼠标）
4. 按住按钮蓄力，松开跳跃

**预期结果:** ✅ 触摸和鼠标都正常工作

---

### 测试 7: 未知消息类型安全忽略

**步骤:**
1. 打开浏览器开发者工具
2. 在控制台输入:

```javascript
// 发送未知消息类型
ws.send(JSON.stringify({
  event: 'game_message',
  type: 'unknown_message_type',
  data: {}
}));
```

**预期结果:** ⚠️ Unity 控制台显示 warning 日志，但不崩溃

```
[GameManager] Unknown message type: unknown_message_type
```

---

### 测试 8: 广播消息接收

**步骤:**
1. 打开 2 个控制器
2. 控制器 A 成功跳跃并着陆
3. 观察控制器 B 是否收到分数更新广播

**预期结果:** ✅ 所有控制器都收到 `state.score_update` 广播

---

### 测试 9: 游戏结束广播

**步骤:**
1. 控制器操作玩家跳跃
2. 故意让玩家掉落（跳到平台外）
3. 观察所有控制器是否收到 `state.game_over` 广播

**预期结果:** ✅ 所有控制器收到游戏结束消息

---

### 测试 10: Unity WebGL 专用 JS 调用

**步骤:**
1. 在 Unity Editor 中运行（非 WebGL 模式）
2. 尝试发送广播消息
3. 观察控制台输出

**预期结果:** 📝 显示 `[PartyGameBridge] [Editor Mode] Would send to JS: ...`（不调用 `SendToJavaScript`）

4. 构建 WebGL 并在浏览器中运行
5. 发送广播消息
6. 观察浏览器控制台

**预期结果:** ✅ 成功调用 `SendToJavaScript` 并发送到服务器

---

## 🐛 常见问题排查

### 问题 1: Unity WebGL 加载失败

**症状:** `screen.html` 显示 "正在加载游戏..." 但无法加载

**排查:**
1. 检查 `CONFIG.unityBuildUrl` 和 `CONFIG.unityLoaderUrl` 是否正确
2. 打开浏览器开发者工具 (F12) → `Console` 查看错误信息
3. 确保构建输出文件存在且路径正确

**解决:**
- 修正 `screen/index.html` 中的路径配置
- 重新构建 Unity WebGL

---

### 问题 2: WebSocket 连接失败

**症状:** 屏幕端或控制器端显示 "🔴 与服务器断开连接"

**排查:**
1. 检查服务器是否运行: `npm start`
2. 检查端口 3000 是否被占用
3. 查看服务器控制台输出

**解决:**
- 重启服务器
- 检查防火墙设置
- 确保客户端和服务器在同一网络（如果跨设备）

---

### 问题 3: 控制器加入被拒绝

**症状:** 控制器显示 "❌ 加入失败: Cannot specify playerIndex - server assigned only"

**原因:** 控制器代码尝试伪造 `playerIndex`

**排查:**
1. 检查 `controller/index.html` 中的 `joinGame()` 函数
2. 确保没有发送 `playerIndex` 字段

**解决:**
- 确保 `joinGame()` 只发送 `playerName`，不发送 `playerIndex`

---

### 问题 4: Unity 未收到消息

**症状:** 控制器发送输入，但屏幕端 Unity 无反应

**排查:**
1. 检查 `PartyGameBridge` GameObject 是否存在于场景中
2. 检查 `PartyGameBridge.cs` 的 `OnMessageReceivedEvent` 是否绑定到 `GameManager.cs`
3. 查看 Unity 控制台日志

**解决:**
- 确保 `GameManager.cs` 在 `Start()` 中订阅了 `PartyGameBridge.Instance.OnMessageReceivedEvent`
- 检查 `PartyGameBridge.cs` 的 `enableDebugLog` 是否启用

---

### 问题 5: 分数不更新

**症状:** 玩家成功着陆，但控制器分数未更新

**排查:**
1. 检查 `UIManager.cs` 是否正确解析分数 JSON
2. 检查 `PartyGameBridge.cs` 的 `BroadcastScoreUpdate()` 是否发送正确的 JSON 格式

**解决:**
- 确保分数 JSON 格式正确: `{"0":1,"1":2}`
- 检查 `UIManager.cs` 的 `ParseScoresJson()` 实现

---

## 📊 性能优化建议

### Unity WebGL 优化

1. **使用 IL2CPP 后端**（更快的运行时性能）
2. **启用 Brotli 压缩**（更小的构建大小）
3. **减少 Draw Call**（合并材质、使用 Static Batching）
4. **优化物理**（简化 Collider、降低 Fixed Timestep）

### 网络优化

1. **减少消息频率**（蓄力更新可以节流）
2. **使用二进制协议**（例如 MessagePack 替代 JSON）
3. **压缩 WebSocket 消息**（如果支持）

---

## 📖 附录: 消息格式完整参考

### 控制器 → 服务器

**加入游戏:**
```json
{
  "type": "controller_join",
  "playerName": "Player_abc12"
}
```

**蓄力开始:**
```json
{
  "event": "game_message",
  "type": "input.charge_start",
  "data": {}
}
```

**蓄力结束:**
```json
{
  "event": "game_message",
  "type": "input.charge_end",
  "data": {
    "power": 0.75
  }
}
```

**Tap:**
```json
{
  "event": "game_message",
  "type": "input.tap",
  "data": {}
}
```

### 服务器 → 控制器/屏幕

**分配玩家:**
```json
{
  "type": "player_assigned",
  "playerIndex": 0,
  "playerName": "Player_abc12"
}
```

**拒绝加入:**
```json
{
  "type": "player_rejected",
  "reason": "Cannot specify playerIndex - server assigned only"
}
```

**玩家加入通知（仅屏幕）:**
```json
{
  "type": "player_joined",
  "player": {
    "playerIndex": 0,
    "playerName": "Player_abc12"
  }
}
```

**玩家离开通知（仅屏幕）:**
```json
{
  "type": "player_left",
  "playerIndex": 0
}
```

**输入转发（仅屏幕/Unity）:**
```json
{
  "event": "game_message",
  "type": "input.charge_end",
  "playerIndex": 0,
  "data": {
    "power": 0.75
  }
}
```

### Unity → 广播（所有控制器）

**分数更新:**
```json
{
  "event": "broadcast",
  "type": "state.score_update",
  "data": {
    "scores": "{\"0\":1,\"1\":2}"
  }
}
```

**游戏结束:**
```json
{
  "event": "broadcast",
  "type": "state.game_over",
  "data": {
    "finalScore": 5,
    "winnerIndex": 1
  }
}
```

---

## 🎉 完成！

恭喜！你已经成功搭建了 PartyGameSDK 的 Unity WebGL 跳一跳 Demo。

**下一步:**
- 优化游戏玩法（增加平台生成算法、音效、动画）
- 添加更多游戏模式
- 部署到生产环境（使用 HTTPS + WSS）

**参考资料:**
- [Unity WebGL 文档](https://docs.unity3d.com/Manual/webgl.html)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [PartyGameSDK README](./README.md)

---

**作者:** PartyGameSDK Team  
**版本:** 1.0.0  
**日期:** 2026-05-22
