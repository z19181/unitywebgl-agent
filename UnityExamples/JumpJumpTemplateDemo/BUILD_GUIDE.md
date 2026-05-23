# JumpJump Template Demo — WebGL Build Guide

**PartyGameSDK v0.2.6**

在 5 分钟内完成：场景创建 → Unity WebGL 构建 → 启动 server → 扫码游玩。

---

## 目录

1. [环境要求](#环境要求)
2. [导入模板](#导入模板)
3. [一键生成场景](#一键生成场景)
4. [选择 WebGL Template](#选择-webgl-template)
5. [Build WebGL](#build-webgl)
6. [接入 PartyGameSDK Server](#接入-partygamesdk-server)
7. [扫码测试](#扫码测试)
8. [常见错误排查](#常见错误排查)

---

## 环境要求

| 工具 | 版本要求 |
|---|---|
| Unity | 2022.3 LTS 或更高 |
| WebGL Build Support | 已安装 (Unity Hub → Installs → Add Modules) |
| Node.js | v18+ |
| PartyGameSDK Server | v0.2.6 (`platform/v0.2.6` 分支) |

---

## 导入模板

### 方式 A: 拷贝整个示例工程（推荐）

```bash
# 将 UnityExamples/JumpJumpTemplateDemo/ 拷贝到你的 Unity 项目
cp -r UnityExamples/JumpJumpTemplateDemo/Assets/*   YourGameProject/Assets/
```

已完成的工作:
- ✅ `Assets/Scripts/Platform/` — PartyGameBridge / Message / Types
- ✅ `Assets/Scripts/Game/` — JumpJumpGameManager / PlayerJump / PlatformSpawner / CameraFollow / UIManager
- ✅ `Assets/Editor/` — 一键场景生成
- ✅ `Assets/Plugins/WebGL/` — JSLib
- ✅ `Assets/WebGLTemplates/PartyGameTemplate/` — Unity WebGL 模板
- ✅ Player / Platform 预制体

### 方式 B: 仅导入模板（已有游戏）

```bash
cp -r UnityWebGLTemplate/WebGLTemplates/PartyGameTemplate   YourGameProject/Assets/WebGLTemplates/
cp -r UnityWebGLTemplate/Assets/Scripts/Platform/            YourGameProject/Assets/Scripts/
cp -r UnityWebGLTemplate/Assets/Plugins/WebGL/               YourGameProject/Assets/Plugins/
```

---

## 一键生成场景

在 Unity Editor 中：

1. 点击菜单栏 **Tools → PartyGame → Create JumpJump Template Demo Scene**
2. 等待自动创建完成（约 2 秒）
3. 场景自动保存到 `Assets/Scenes/JumpJumpTemplateDemo.unity`

**自动创建的内容:**

| GameObject | 组件 | 说明 |
|---|---|---|
| Main Camera | Camera + CameraFollow | 跟随玩家 |
| Directional Light | Light | 环境光照 |
| **PartyGameBridge** | PartyGameBridge | ★ 通信桥（名称不可改） |
| GameManager | JumpJumpGameManager | 游戏逻辑 + 网络集成 |
| SpawnPoint | Transform | 玩家出生点 |
| PlatformSpawner | PlatformSpawner | 动态平台生成 |
| PlatformPrefab | Cube + Renderer | 平台预制体 |
| PlayerPrefab | Capsule + PlayerJump | 玩家预制体 |
| Canvas | Canvas + UIManager | Score/Status/Power/GameOver |

---

## 选择 WebGL Template

1. **File → Build Settings**
2. 选择 **WebGL** → **Switch Platform**（等待切换完成）
3. **Player Settings** → **Resolution and Presentation**
4. **WebGL Template** → 选择 **PartyGameTemplate**

```
Player Settings
└── Resolution and Presentation
    └── WebGL Template: PartyGameTemplate  ← 选这个
```

**验证:** 模板的 `index.html` 包含 `<!-- PartyGameSDK UI Overlay -->` 注释。

---

## Build WebGL

1. **File → Build Settings**
2. 点击 **Add Open Scenes** (确保 `JumpJumpTemplateDemo` 在列表中)
3. 设置输出目录: `YourGameProject/Build/`
4. 点击 **Build**

```bash
# 输出目录结构
Build/
├── index.html          ← 由 PartyGameTemplate 生成
├── Build/
│   ├── YourGame.data.gz
│   ├── YourGame.framework.js.gz
│   ├── YourGame.wasm.gz
│   └── YourGame.loader.js
└── TemplateData/
    ├── favicon.ico
    └── style.css
```

⚠️ **压缩格式建议:** Player Settings → Publishing Settings → **Compression Format: Gzip** (Node.js `express.static` 原生支持)

---

## 接入 PartyGameSDK Server

### 1. 拷贝 Build 到 server

```bash
cp -r YourGameProject/Build/  \
     PartyGameSDK-MVP/screen-build/
```

### 2. Server 静态路由配置

> ⚠️ v0.2.6 不修改 server.js。通过启动脚本或环境变量切换 screen 目录。

**方式 A: 修改 server.js 中的静态路由（一次性）**

```javascript
// server/server.js 中修改:
app.use('/screen', express.static(__dirname + '/../screen-build'));
//                                ^^^^^^^^^^^^^^^^^^^^^^^
//                                指向 Unity WebGL Build 输出
```

**方式 B: 使用启动脚本（推荐）**

```bash
# scripts/start-with-webgl.sh
#!/bin/bash
SCREEN_DIR="${SCREEN_DIR:-screen-build}"
sed -i.bak "s|/screen',.*|/screen', express.static(__dirname + '/../${SCREEN_DIR}'));|" server/server.js
node server/server.js
```

### 3. 启动

```bash
cd PartyGameSDK-MVP
node server/server.js

# 输出:
# 🎮 Party Game SDK v0.2.2 Server
# 📡 Running on http://localhost:3000
# 📺 Screen: http://localhost:3000/screen      ← 你的 Unity WebGL
# 🎮 Controller: http://localhost:3000/controller
```

---

## 扫码测试

### 1. 打开 Screen

浏览器访问: **http://localhost:3000/screen**

应该看到:
- Unity WebGL 游戏加载画面
- 顶部 overlay: "Room Open" + Room ID + QR Code

### 2. 打开 Controller

**方式 A: 扫码**（手机扫描屏幕上的 QR Code）

**方式 B: URL 直接访问**
```
http://localhost:3000/controller?room=XXXXXX
```
(XXXXXX 为 screen 上显示的 Room ID)

### 3. 操作

| Action | Controller | Screen/Unity |
|---|---|---|
| 按住蓄力 | 圆圈变绿 + 能量条增长 | Player 进入 Charging 状态 |
| 松手跳跃 | 发送 `input.charge_end` | Player 跳起 + 落到平台上 |
| 重新蓄力 | 落地后可再次蓄力 | 分数 +1, 新平台生成 |
| 多人加入 | 其他玩家扫码 | 自动生成对应颜色玩家 |
| 全部死亡 | 自动结束 | UI 显示 Game Over + 最终分数 |

### 4. 验证链路

检查浏览器 Console:

```
[PartyGame] Connected                               ← WebSocket connected
[PartyGame] Room created: A1B2C3                     ← Server response
[PartyGame] ← JS: {"event":"game_message",...}       ← Server forward
[PartyGameBridge.jslib] Unity → JS: broadcast...     ← Unity broadcast
[PartyGame] Unity → server: broadcast...              ← Forward to server
```

Controller Console:

```
[Controller] Sent input.charge_start (NO playerIndex) ← ⚠️ 不发送 playerIndex
[Controller] Received broadcast: state.score_update   ← Server 广播
```

---

## 常见错误排查

### ❌ Unity 收不到消息

| 检查项 | 验证方法 |
|---|---|
| GameObject 名称 | 必须是 **`PartyGameBridge`**（精确匹配） |
| OnPlatformMessage 方法 | `JumpJumpGameManager` 有 `OnPlatformMessage(PartyGameMessage)` |
| PartyGameBridge 绑定 | 检查 `OnMessageReceivedEvent.AddListener` 是否调用 |
| Console 日志 | 搜索 `[PartyGame]` 和 `[JumpJump]` |

### ❌ Controller 收不到广播

| 检查项 | 验证方法 |
|---|---|
| server 运行中 | `lsof -i :3000` 应有 node 进程 |
| broadcast event 字段 | JSON 必须包含 `"event": "broadcast"` |
| WebSocket 连接 | Controller Console 显示 "Connected" + "Joined as P0" |
| 防火墙 | 确认 3000 端口可访问 |

### ❌ WebGL Build 失败

| 错误 | 解决方案 |
|---|---|
| `.jslib` 未找到 | 确认 `Assets/Plugins/WebGL/PartyGameBridge.jslib` 存在 |
| 平台错误 | File → Build Settings → WebGL → Switch Platform |
| 内存溢出 | Player Settings → Memory Size: 512MB+ 或上采样减少 |

### ❌ 编码乱码

| 场景 | 解决方案 |
|---|---|
| 中文 UI 乱码 | C# → JSON → JS 保持 UTF-8 |
| 分数显示 0 | `JsonUtility` 字段名大小写敏感，确认 `public string scores` 匹配 |

### ❌ 玩家不生成

| 检查项 | 说明 |
|---|---|
| Server 注入 playerIndex | 确认 `game_message` 包含 `playerIndex` 字段 |
| GameManager 收到消息 | Console 搜索 `[JumpJump] ← msg:` |

### ❌ 断开后重连失败

| 情况 | 说明 |
|---|---|
| 10 秒内重连 | reconnectToken 有效，自动复用 playerIndex |
| 超过 10 秒 | reconnectToken 过期，Controller 自动重新 join_room（新 playerIndex） |

---

## 文件参考

### 示例工程文件清单

```
UnityExamples/JumpJumpTemplateDemo/
├── Assets/
│   ├── Scripts/
│   │   ├── Platform/
│   │   │   ├── PartyGameBridge.cs         # 双向通信桥 (OnPlatformMessage 入口)
│   │   │   ├── PartyGameMessage.cs        # 消息结构
│   │   │   └── PartyGameTypes.cs          # 类型常量
│   │   └── Game/
│   │       ├── JumpJumpGameManager.cs     # ★ 核心游戏逻辑
│   │       ├── PlayerJump.cs              # 玩家跳跃控制
│   │       ├── PlatformSpawner.cs         # 平台生成/回收
│   │       ├── CameraFollow.cs            # 相机跟随
│   │       └── UIManager.cs               # UI 管理
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── PartyGameBridge.jslib      # JS 插件
│   ├── Editor/
│   │   └── CreateJumpJumpTemplateScene.cs # 一键场景生成
│   ├── WebGLTemplates/
│   │   └── PartyGameTemplate/
│   │       ├── index.html                 # Unity WebGL 模板
│   │       └── partygame-template.js      # 初始化脚本
│   └── Scenes/
│       └── JumpJumpTemplateDemo.unity     # (自动生成)
└── BUILD_GUIDE.md                         # 本文件
```

---

**PartyGameSDK v0.2.6** — Build → Scan → Play!
