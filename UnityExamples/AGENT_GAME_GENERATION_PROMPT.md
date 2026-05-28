# AGENT_GAME_GENERATION_PROMPT — v0.2.7

当用户说"新小游戏：{GameName}"或"创建一个{GameName}模板"时，Agent 必须按以下步骤执行。

---

## Step 1: 从 Skeleton 复制

```bash
GAME={GameName}
cp -r UnityExamples/_GameTemplateSkeleton/Assets/* \
     UnityExamples/${GAME}TemplateDemo/Assets/
```

已包含的复用文件:
- ✅ `PartyGameBridge.cs` — 通信桥（不改）
- ✅ `PartyGameMessage.cs` — 消息结构（不改）
- ✅ `PartyGameTypes.cs` — 类型常量（不改）
- ✅ `PartyGameBridge.jslib` — JS 插件（不改）
- ✅ `WebGLTemplates/PartyGameTemplate/*` — Unity 模板（不改）

---

## Step 2: 创建 GameManager

文件: `Assets/Scripts/Game/{GameName}GameManager.cs`

### 必须实现的方法

```csharp
// ★ 入口（固定名称）
public void OnPlatformMessage(PartyGameMessage msg)

// ★ 输入处理（根据游戏输入类型）
void HandleTap(int playerIndex)
void HandleMove(int playerIndex, float x)
void HandleDirection(int playerIndex, string dir)
void HandleChargeStart(int playerIndex)
void HandleChargeEnd(int playerIndex, float power)

// ★ 广播
void BroadcastScoreUpdate()
void BroadcastGameOver(int finalScore, int winnerIndex)
```

### 必须遵循的规则

1. ⚠️ 使用 `msg.playerIndex`（server 注入），不自行计算
2. ⚠️ 通过 `PartyGameBridge.Instance.Broadcast(type, dataJson)` 广播
3. ⚠️ 在 `Start()` 中注册监听 `PartyGameBridge.Instance.OnMessageReceivedEvent.AddListener(OnPlatformMessage)`
4. ⚠️ 在 `OnDestroy()` 中移除监听

---

## Step 3: 创建游戏组件

根据游戏需要创建辅助脚本：

| 组件模式 | 适用游戏 | 脚本名 |
|---|---|---|
| 跳跃物理 | JumpJump, Flappy | `Player{GameName}.cs` |
| 移动控制 | Snake, Breakout | `{GameName}Controller.cs` |
| 平台/障碍生成 | JumpJump, Flappy | `{Object}Spawner.cs` |
| 碰撞检测 | 全部 | 内联在 GameManager |
| UI 管理 | 全部 | `UIManager.cs` |

---

## Step 4: 创建 Editor 场景脚本

文件: `Assets/Editor/Create{GameName}Scene.cs`

### 强制要求

- MenuItem 路径: `Tools/PartyGame/Create {GameName} Template Scene`
- 必须创建 **`PartyGameBridge`** GameObject（名称精确）
- 拖入所有组件
- Scene 保存到 `Assets/Scenes/{GameName}TemplateDemo.unity`

---

## Step 5: 生成文档

### BUILD_GUIDE.md

7 个必须章节:
1. 环境要求
2. 导入模板
3. 一键生成场景
4. 选择 WebGL Template
5. Build WebGL
6. 接入 Server
7. 扫码测试

### TEST_CHECKLIST.md

3 组测试:
- A. 基线回归 (30 项)
- B. 游戏专项 (10 项)
- C. 输入协议测试 (N 项)

---

## Step 6: 运行测试

### 先跑基线回归

```bash
# 必须全部通过（不可接受基线回归失败）
node _test_v026.js  # 或对应的测试脚本
```

### 再跑游戏专项

- 工程目录完整检查
- PartyGameBridge 复用检查
- GameManager 入口检查
- 输入处理检查
- 广播检查
- Editor 脚本检查
- 文档完整检查

---

## 硬性约束

| 约束 | 说明 |
|---|---|
| ⚠️ **不修改 server.js** | 零修改 |
| ⚠️ **不修改 PartyGameBridge** | 复用现有文件 |
| ⚠️ **不破坏五条铁律** | controller → server → Unity → controller |
| ⚠️ **不新增 game_message.type** | 使用已有 input.xxx / state.xxx |
| ⚠️ **先跑基线回归** | 不可接受基线失败 |

---

## 输入类型 → 游戏映射

| 输入类型 | 数据格式 | 适用游戏 |
|---|---|---|
| `input.tap` | 无 | Flappy Bird, 跑酷 |
| `input.charge_start/end` | `{power:0-1}` | JumpJump |
| `input.move` | `{x:0-1}` | Breakout 挡板 |
| `input.direction` | `"up"/"down"/"left"/"right"` | Snake, 2048 |
| `input.swipe` | `{dx,dy}` | Fruit Ninja |

---

## 常见游戏模板速查

### Flappy Bird
- **输入:** `input.tap`
- **GameManager:** 管道生成, 鸟物理, 碰撞, 计分
- **广播:** `state.score_update` (过管道), `state.game_over` (碰撞)

### Breakout
- **输入:** `input.move` (x 坐标)
- **GameManager:** 挡板移动, 球物理, 砖块, 计分
- **广播:** `state.score_update` (打砖), `state.game_over` (球落地)

### Snake
- **输入:** `input.direction` (up/down/left/right)
- **GameManager:** 蛇移动, 吃食物, 碰撞, 计分
- **广播:** `state.score_update` (吃食物), `state.game_over` (撞自己/墙)

### 2048
- **输入:** `input.direction` (up/down/left/right)
- **GameManager:** 网格移动, 合并, 新块, 胜利/失败
- **广播:** `state.score_update` (合并后), `state.game_over` (无移动)

### JumpJump
- **输入:** `input.charge_start/end`
- **GameManager:** 蓄力跳, 平台, 计分
- **广播:** `state.score_update` (落地), `state.game_over` (坠落)

---

## Optional Unity AI Asset Pipeline (v0.4.2)

> Unity AI / Muse / Sentis / ML-Agents 是**可选辅助能力**，不是 PartyGameSDK 核心。详见 `UnityExamples/UNITY_AI_OPTIONAL_WORKFLOW.md`。

### AI 资产生成规则

当游戏需要新素材时，Agent 可选择使用 Muse：

| 需求 | Muse 能力 | 输出路径 |
|---|---|---|
| 角色/道具精灵 | Muse Sprite | `Assets/Art/Generated/Sprites/` |
| 背景/地面纹理 | Muse Texture | `Assets/Art/Generated/Textures/` |
| UI 图标 | Muse Sprite | `Assets/Art/Generated/UI/` |
| C# 脚本加速 | Muse Chat | 作为参考，人工修改 |

### AI 使用原则

1. AI 资产必须在 `Assets/Art/Generated/` 下，**人工审核后**才移入模板
2. AI 资产不计入 PartyGameSDK 核心文件（不提交到 Platform/ 目录）
3. 优先用手写代码和简单图形，AI 仅用于复杂素材需求
4. 控制每游戏 AI 资产总量 ≤ 8 MB
5. **不修改 server | 协议 | 五条铁律**以引入 AI

### 不引入的 AI 能力

- Sentis → 不入默认模板（仅高级玩法）
- ML-Agents → 不入默认模板（仅长期探索）
- NavMesh → 仅 NPC 寻路游戏按需启用

---

### Material Policy（v1.0.1-governance）

**参考：** `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md`

Agent 生成材质时必须遵守：

1. **默认 Shader：** URP Simple Lit / Unlit/Texture / Sprite/Default
2. **禁止：** HDRP、未验证 ShaderGraph、GrabPass、Compute Shader
3. **纹理上限：** 默认 1024×1024，禁止 4K
4. **AI 生成资产路径：** `Assets/Art/Generated/{date}-{batch}/` → 人工审核 → `WebGLSafe/`
5. **AI 生成 Shader 必须注明：** `// AI-GENERATED — REQUIRES WEBGL VERIFICATION`
6. **WebGL Material Validation Gate：** 6 项检查全部通过后才能进入模板
