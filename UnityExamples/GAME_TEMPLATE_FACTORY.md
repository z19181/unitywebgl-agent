# Game Template Factory — v0.2.7

标准化新小游戏生成流程。从 `_GameTemplateSkeleton/` 复制 → Agent 自动填充 → 一键可运行。

---

## 1. 新小游戏目录标准

```
UnityExamples/{GameName}TemplateDemo/
├── Assets/
│   ├── Scripts/
│   │   ├── Platform/              # ← 从 _GameTemplateSkeleton 复制（不修改）
│   │   │   ├── PartyGameBridge.cs
│   │   │   ├── PartyGameMessage.cs
│   │   │   └── PartyGameTypes.cs
│   │   └── Game/
│   │       ├── {GameName}GameManager.cs    # ★ 核心（Agent 生成）
│   │       └── {Component}*.cs             #    辅助组件（Agent 生成）
│   ├── Plugins/
│   │   └── WebGL/
│   │       └── PartyGameBridge.jslib       # ← 复制（不修改）
│   ├── WebGLTemplates/
│   │   └── PartyGameTemplate/             # ← 复制（不修改）
│   │       ├── index.html
│   │       └── partygame-template.js
│   ├── Editor/
│   │   └── Create{GameName}Scene.cs        # ★ 一键场景生成
│   └── Scenes/
│       └── {GameName}TemplateDemo.unity    # （自动生成）
├── BUILD_GUIDE.md                          # ★ 构建指南
├── GAME_SPEC.md                            # ★ 游戏规格
└── TEST_CHECKLIST.md                       # ★ 测试清单
```

## 2. 复用规则

### 2.1 Platform 脚本（只复用，不修改）

| 文件 | 来源 | 说明 |
|---|---|---|
| `PartyGameBridge.cs` | `_GameTemplateSkeleton` | `OnPlatformMessage` 入口，`Broadcast()` 方法 |
| `PartyGameMessage.cs` | `_GameTemplateSkeleton` | 消息结构（`@event`/`type`/`playerIndex`/`data`） |
| `PartyGameTypes.cs` | `_GameTemplateSkeleton` | 类型常量（`INPUT_TAP`/`STATE_SCORE_UPDATE`） |

### 2.2 插件

| 文件 | 来源 | 说明 |
|---|---|---|
| `PartyGameBridge.jslib` | `_GameTemplateSkeleton` | `SendToJavaScript()` → `window.PartyGameSendToServer()` |

### 2.3 WebGL Template

| 文件 | 来源 | 说明 |
|---|---|---|
| `index.html` | `_GameTemplateSkeleton` | Unity WebGL 输出页 + screen overlay |
| `partygame-template.js` | `_GameTemplateSkeleton` | WebSocket/QR/玩家列表/Unity 转发 |

---

## 3. GameManager 命名规范

| 元素 | 命名规则 | 示例 |
|---|---|---|
| 类名 | `{GameName}GameManager` | `SnakeGameManager`, `FlappyGameManager` |
| 入口方法 | `OnPlatformMessage(PartyGameMessage msg)` | 固定名称 |
| 消息监听 | `PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage)` | 在 `Start()` 中 |
| 输入处理 | `Handle{InputType}(int playerIndex, ...)` | `HandleDirection(int pi, string dir)` |
| 广播 | `PartyGameBridge.Instance.Broadcast(type, dataJson)` | `BroadcastScoreUpdate(scores)` |

### 标准 GameManager 骨架

```csharp
using System.Collections.Generic;
using UnityEngine;

public class {GameName}GameManager : MonoBehaviour
{
    public static {GameName}GameManager Instance { get; private set; }

    void Awake() { if (Instance != null) { Destroy(gameObject); return; } Instance = this; }

    void Start()
    {
        if (PartyGameBridge.Instance != null)
            PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage);
    }

    void OnDestroy()
    {
        if (PartyGameBridge.Instance != null)
            PartyGameBridge.Instance.OnMessageReceivedEvent.RemoveListener(OnPlatformMessage);
    }

    // ★ 入口：处理 server 转发的 game_message
    public void OnPlatformMessage(PartyGameMessage msg)
    {
        int pi = msg.playerIndex;  // ← server 注入，不可伪造
        switch (msg.type)
        {
            // case PartyGameTypes.INPUT_TAP: HandleTap(pi); break;
            // case PartyGameTypes.INPUT_DIRECTION: HandleDirection(pi, msg.data); break;
        }
    }

    // ★ 广播：Unity → server → controllers
    void BroadcastScoreUpdate() { PartyGameBridge.Instance.BroadcastScoreUpdate(scores); }
    void BroadcastGameOver(int finalScore, int winnerIndex)
        { PartyGameBridge.Instance.BroadcastGameOver(finalScore, winnerIndex); }
}
```

---

## 4. Controller 输入类型规范

| Type | JSON | 数据 | 适用游戏 |
|---|---|---|---|
| `input.tap` | `{event:"game_message", type:"input.tap"}` | 无 | Flappy Bird, 跑酷跳跃 |
| `input.charge_start` | `{..., type:"input.charge_start"}` | 无 | JumpJump, 蓄力类 |
| `input.charge_end` | `{..., type:"input.charge_end", data:"{\"power\":0.8}"}` | `{power:0-1}` | JumpJump, 蓄力类 |
| `input.move` | `{..., type:"input.move", data:"{\"x\":0.5}"}` | `{x:0-1}` | Breakout 挡板 |
| `input.direction` | `{..., type:"input.direction", data:"\"up\""}` | `"up"/"down"/"left"/"right"` | Snake, 2048 |
| `input.swipe` | `{..., type:"input.swipe", data:"{\"dx\":1,\"dy\":0}"}` | `{dx,dy}` | Fruit Ninja 类 |

### 输入兼容性

| 游戏 | 主要输入 | Fallback 输入 |
|---|---|---|
| Flappy Bird | `input.tap` | — |
| JumpJump | `input.charge_start/end` | `input.tap` |
| Breakout | `input.move` | `input.direction:"left"/"right"` |
| Snake | `input.direction` | `input.swipe` |
| 2048 | `input.direction` | `input.swipe` |
| 跑酷 | `input.tap` | `input.direction:"up"` |

---

## 5. Unity 状态广播规范

| 广播类型 | JSON | 触发条件 | 必传字段 |
|---|---|---|---|
| `state.score_update` | `{event:"broadcast", type:"state.score_update", data:{"scores":"{\"0\":10}"}}` | 分数变化 | `scores` (JSON string of Dict<int,int>) |
| `state.game_over` | `{..., type:"state.game_over", data:{"finalScore":50,"winnerIndex":0}}` | 所有玩家死亡/结束 | `finalScore`, `winnerIndex` |
| `feedback.vibrate` | `{..., type:"feedback.vibrate", data:"{\"playerIndex\":0,\"pattern\":\"short\"}"}` | 碰撞/事件 | `playerIndex`, `pattern` |
| `feedback.hit` | `{..., type:"feedback.hit"}` | 碰撞 | 可选 |
| `feedback.death` | `{..., type:"feedback.death"}` | 玩家死亡 | 可选 |

### 广播频率限制

| 游戏 | 广播频率 | 原因 |
|---|---|---|
| Snake | 每次吃食物 (~3-10s) | 低频 |
| Flappy Bird | 每次过管道 (~2-5s) | 低频 |
| JumpJump | 每次落地 (~1-3s) | 中频 |
| Breakout | 每次撞砖 (~0.1-0.5s) | 高频 — 建议合并 200ms |
| 2048 | 每次合并 (~3-10s) | 低频 |

---

## 6. Editor 一键场景脚本规范

### 6.1 菜单路径

`Tools → PartyGame → Create {GameName} Template Scene`

### 6.2 必须创建的 GameObject

| GameObject | 组件 | 说明 |
|---|---|---|
| Main Camera | Camera | 正交或透视 |
| Directional Light | Light | 环境光 |
| **PartyGameBridge** | PartyGameBridge | ★ 名称不可改 |
| GameManager | {GameName}GameManager | 游戏逻辑 |
| Canvas | Canvas + CanvasScaler + GraphicRaycaster | ScreenSpaceOverlay |
| ScoreText | Text | 分数显示 |
| StatusText | Text | 状态显示 |
| GameOverPanel | Image + Text | 结束面板 |

### 6.3 脚本模板

```csharp
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public class Create{GameName}Scene : EditorWindow
{
    [MenuItem("Tools/PartyGame/Create {GameName} Template Scene")]
    public static void CreateScene()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

        // 1. Main Camera
        // 2. Light
        // 3. PartyGameBridge (名称精确!)
        var bridgeGo = new GameObject("PartyGameBridge");
        bridgeGo.AddComponent<PartyGameBridge>();
        // 4. GameManager
        var gmGo = new GameObject("GameManager");
        gmGo.AddComponent<{GameName}GameManager>();
        // 5. Canvas + UI
        // ...
        // 6. Save scene
        EditorSceneManager.SaveScene(scene, "Assets/Scenes/{GameName}TemplateDemo.unity");
    }
}
```

---

## 7. BUILD_GUIDE.md 生成规范

必须包含以下 7 个章节：

1. **环境要求** — Unity 版本, Node.js 版本
2. **导入模板** — `cp -r _GameTemplateSkeleton/Assets/* → YourProject`
3. **一键生成场景** — Tools → PartyGame → Create Scene
4. **选择 WebGL Template** — Player Settings → PartyGameTemplate
5. **Build WebGL** — Output to Build/
6. **接入 Server** — `cp -r Build/ → screen-build/`
7. **扫码测试** — 操作指南 + 链路验证

## 8. TEST_CHECKLIST.md 生成规范

必须包含 3 组测试：

### A. 基线回归 (30 项)
- v0.2.1: T1-T10
- v0.2.2: B1-B12
- v0.2.3: C1-C8

### B. 游戏专项 (10 项)
- 工程目录完整
- PartyGameBridge 复用
- GameManager 入口正确
- 输入处理正确
- 广播正确
- Editor 脚本存在
- BUILD_GUIDE 存在
- server.js 零修改
- 五条铁律满足
- 支持 multiplayer

### C. 输入协议测试 (N 项)
- 每种输入类型的发送/接收/处理验证

---

## 9. Optional Unity AI Asset Pipeline (v0.4.2)

> Unity AI / Muse / Sentis / ML-Agents 是**可选辅助能力**，不是 PartyGameSDK 核心。详见 `UnityExamples/UNITY_AI_OPTIONAL_WORKFLOW.md`。

### 9.1 AI 资产路径规范

```
Assets/Art/Generated/
├── Sprites/     ← Muse Sprite 生成
├── Textures/    ← Muse Texture 生成
├── UI/          ← UI 图标
└── Animations/  ← 简单动画
```

**审核流程:** Muse 生成 → `Generated/` → 人工审核 → 缩放压缩 → `Assets/Art/{GameName}/`

### 9.2 体积控制

| 资产类型 | 单文件上限 | 每游戏上限 |
|---|---|---|
| Sprite | 256 KB | 2 MB |
| Texture | 512 KB | 4 MB |
| 背景图 | 1 MB | 2 MB |

WebGL 首包预算 ≤ 20 MB。

### 9.3 不进入默认模板

- Sentis（本地 AI 模型推理）→ 按需引入
- ML-Agents（强化学习）→ 仅长期探索
- NavMesh → 仅在 NPC 寻路游戏中使用

### 9.4 AI 不阻塞 Release

任何 AI 能力的引入或移除不改变 PartyGameSDK Release State。

---

## 10. Verified Multi-Game WebGL Build Queue

**Status:** ✅ PASS — 4/4 games built and verified  
**Date:** 2026-05-23  
**Report:** `UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md`

### 10.1 Build Matrix

| Game | Build | Check | Output Dir | Builder Script |
|---|---|---|---|---|
| JumpJump | ✅ PASS | 22/22 | `screen/Build/` | `JumpJumpWebGLBuilder.BuildWebGL` |
| Snake | ✅ PASS | 22/22 | `screen/Build_Snake/` | `SnakeWebGLBuilder.BuildWebGL` |
| 2048 | ✅ PASS | 22/22 | `screen/Build_2048/` | `Game2048WebGLBuilder.BuildWebGL` |
| Breakout | ✅ PASS | 22/22 | `screen/Build_Breakout/` | `BreakoutWebGLBuilder.BuildWebGL` |

### 10.2 Gate Requirements

New game templates **must** pass this gate:

```
1. Agent creates: Assets/Scripts/Game/{Game}GameManager.cs
                 Assets/Editor/Create{Game}Scene.cs
                 Assets/Editor/{Game}WebGLBuilder.cs
2. Codex runs: EMSDK_PYTHON=python3.11 Unity -batchmode -executeMethod {Game}WebGLBuilder.BuildWebGL
3. QClaw checks: node scripts/check-unity-webgl-build.js screen/Build_{Game}
4. QClaw writes: WEBGL_BUILD_VALIDATION_REPORT.md
5. Gate: 22/22 PASS
```

### 10.3 Common Pitfalls (Do Not Repeat)

| Issue | Cause | Fix |
|---|---|---|
| `Arial.ttf` not valid | Unity 6 removed built-in font | Use `LegacyRuntime.ttf` |
| JSONDecodeError in Emscripten | Python 3.9 + Node.js v22 | `EMSDK_PYTHON=python3.11` |
| Background build fails | Env var not propagated | Foreground execution (no `&`) |
| bee_backend ExitCode 4 | Conflicting ProjectSettings GUIDs | Only copy `ProjectVersion.txt` |
| Physics2D CS1069 | Missing built-in module | Add `com.unity.modules.physics2d` to manifest |

### 10.4 Build Queue Does Not Block Release

Unity WebGL Build Queue is a game-template verification tool. It does not:
- Modify `RELEASE_STATE.json` `current_phase`
- Modify `server.js` or core protocol
- Create git tags
- Trigger Release Pipeline phase transitions
