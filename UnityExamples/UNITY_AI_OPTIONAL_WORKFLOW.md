# Unity AI Optional Workflow — v0.4.2

> **定位:** Unity AI / Muse / Sentis / ML-Agents 是 Unity WebGL Agent 的**可选辅助能力**，不是 PartyGameSDK 核心协议能力。  
> **不修改:** server.js | game_message 协议 | 五条铁律 | playerIndex 注入规则

---

## 1. 核心原则

### PartyGameSDK 不依赖 Unity AI

```
┌─────────────────────────────────────────────┐
│  PartyGameSDK 核心（不可依赖 AI）            │
│  ✅ server → WebSocket 消息路由             │
│  ✅ controller → 输入采集（不发送 PI）       │
│  ✅ screen → 消息转发 → Unity SendMessage   │
│  ✅ Unity → PartyGameBridge → Broadcast     │
│  ✅ game_message.type 完全透明               │
│  ✅ Admin / Metrics / Health                 │
└─────────────────────────────────────────────┘
                      ↑ 隔离边界
┌─────────────────────────────────────────────┐
│  Unity AI 可选层（仅辅助游戏生产）            │
│  🎨 Muse     → 素材 / UI / 原型             │
│  🗺️ NavMesh  → NPC 寻路                     │
│  🧠 Sentis   → 语音 / 手势 / 本地模型       │
│  🤖 ML-Agents → AI 对手 / 平衡 / 仿真       │
└─────────────────────────────────────────────┘
```

### 铁律

| # | 规则 |
|---|---|
| 1 | PartyGameSDK 核心协议**永不引用** Unity AI API |
| 2 | AI 资产**仅用于** Unity WebGL 游戏生产提效 |
| 3 | AI 资产必须**人工审核**后才能进入模板 |
| 4 | AI 资产**不放**默认模板 — 由 Build 过程决定是否引入 |
| 5 | 所有 AI 资产**必须控制体积**，WebGL 首包不允许因 AI 资产过大 |

---

## 2. AI 能力分层

### Tier 1 — 🟢 当前优先（Muse 素材生成）

| 能力 | 用途 | 费用 |
|---|---|---|
| **Muse Sprite** | 角色、道具、平台、UI 图标 | 需 Muse 订阅 |
| **Muse Texture** | 背景图、地面纹理、天空盒 | 需 Muse 订阅 |
| **Muse Chat** | 加速 C# / JSLib 脚本编写 | 需 Muse 订阅 |

**产出物路径:**

```
Assets/Art/Generated/
├── Sprites/
│   ├── {GameName}_player.png       # 角色精灵
│   ├── {GameName}_enemy.png        # 敌人精灵
│   └── {GameName}_icon.png         # UI 图标
├── Textures/
│   ├── {GameName}_bg.png           # 背景图
│   └── {GameName}_ground.png       # 地面纹理
└── UI/
    └── {GameName}_panel.png        # UI 面板
```

**审核流程:**

```
Muse 生成 → Assets/Art/Generated/ → 人工审核 → 缩放到目标分辨率 → 移入 Assets/Art/{GameName}/
    ↓ 不通过
   重新生成或手动修改
```

---

### Tier 2 — 🟡 按需启用（NavMesh 寻路）

| 条件 | 说明 |
|---|---|
| **触发条件** | 游戏需要 NPC 在场景中自动寻路 |
| **引入方式** | Unity Editor → Window → AI → Navigation → Bake NavMesh |
| **使用方式** | `GetComponent<NavMeshAgent>().SetDestination(target)` |
| **对 SDK 影响** | **零** — 纯 Unity 客户端逻辑 |
| **WebGL 体积影响** | ~2-5 MB（含 NavMesh 包） |

**适用游戏类型:**
- 大乱斗（AI 小兵冲向敌人）
- 塔防（怪物沿路径行走）
- 追逐类（Pac-Man 幽灵 AI）
- 吃鸡缩圈（AI 移动到安全区）

**文件位置:** `Assets/Scripts/Game/{GameName}NPCController.cs`（游戏脚本，非 SDK）

---

### Tier 3 — 🔴 高级探索（Sentis 本地推理）

| 条件 | 说明 |
|---|---|
| **触发条件** | 需要语音命令、手势识别、本地 AI 模型推理 |
| **引入方式** | `com.unity.sentis` 包 → 加载 `.onnx` 模型 |
| **对 SDK 影响** | **零** — Unity 侧处理，不经过 WebSocket |
| **WebGL 体积影响** | +10-50 MB（模型文件） |
| **⚠️ 限制** | **不入默认模板** — 按游戏按需引入 |

**适用场景（非 MVP）:**
- 🎤 "Jump!" → 语音识别 → Unity 执行跳跃
- ✋ 手势识别 → 方向控制
- 🧠 本地 AI 行为模型 → 智能 NPC

**文件位置:** `Assets/Models/{GameName}.onnx` + `Assets/Scripts/Game/{GameName}AIController.cs`

---

### Tier 4 — 🔴 长期探索（ML-Agents 强化学习）

| 条件 | 说明 |
|---|---|
| **触发条件** | 需要 AI 自己学会玩游戏，或批量仿真测试 |
| **引入方式** | `com.unity.ml-agents` 包 + Python 训练环境 |
| **对 SDK 影响** | **零** — 训练在 Editor/Python 侧完成 |
| **WebGL 体积影响** | +5-10 MB（推理模型 `.onnx`） |
| **⚠️ 限制** | **不入默认模板** — 训练成本高，仅长期探索 |

**适用场景（非 MVP）:**
- 🎮 AI 对手自动匹配玩家水平
- ⚖️ 游戏平衡性自动化测试（1000 局仿真）
- 🏆 AI 自动学习最佳策略

**文件位置:** `Assets/ML/{GameName}/` + `python/train_{GameName}.py`

---

## 3. AI 资产体积规范

| 资产类型 | 单文件上限 | 每个游戏上限 | 压缩建议 |
|---|---|---|---|
| Sprite (PNG) | 256 KB | 2 MB | TexturePacker atlas |
| Texture (PNG) | 512 KB | 4 MB | 压缩到 512×512 |
| UI 图标 | 64 KB | 512 KB | SVG → PNG 64×64 |
| 背景图 | 1 MB | 2 MB | 压缩到 1024×512 |
| 简单动画 | 2 MB | 4 MB | 序列帧 PNG 压缩 |
| .onnx 模型 | N/A | 不入默认模板 | 量化 int8 |

**WebGL 首包预算:** 总计 < 20 MB（含代码 + 资产 + Unity runtime）

---

## 4. 工作流决策树

```
用户说"新小游戏: XXX"
  ↓
是否已有素材？
  ├── 是 → 直接使用，不引入 AI
  └── 否 → 需要新素材？
           ├── 简单图形（方块/圆形）→ 代码生成，不引入 AI
           ├── 需要角色/场景美术 → Muse Sprite/Texture 生成 → 人工审核 → 加入
           └── 需要复杂 AI 行为 → 先用手写规则 → 不够再用 ML-Agents

是否需要 AI NPC？
  ├── 纯路径移动 → NavMesh（Tier 2）
  ├── 需要理解语音/手势 → Sentis（Tier 3，不入默认模板）
  └── 需要自适应 AI 对手 → ML-Agents（Tier 4，不入默认模板）
```

---

## 5. 当前最高优先级

| 优先级 | 任务 | 状态 |
|---|---|---|
| 🔴 P0 | Unity WebGL Real Build Validation | 进行中 |
| 🔴 P0 | screen/Build 真实产物验证 | ⚠️ Emscripten bug |
| 🟡 P1 | Game Template Factory 稳定产出新游戏 | ✅ v0.2.7 |
| 🟢 P2 | Muse Sprite/Texture 素材生成实验 | 待探索 |
| 🟢 P2 | NavMesh NPC 寻路 Demo | 待探索 |
| 🔵 P3 | Sentis 语音控制原型 | 远期 |
| 🔵 P4 | ML-Agents AI 对手 | 远期 |

---

## 6. 与 PartyGameSDK Release 的关系

| AI 能力 | 影响 Release？ | 阻塞 Release？ |
|---|---|---|
| Muse 素材 | ❌ 不影响 | ❌ 不阻塞 |
| NavMesh | ❌ 不影响（游戏侧） | ❌ 不阻塞 |
| Sentis | ❌ 不影响（不入默认模板） | ❌ 不阻塞 |
| ML-Agents | ❌ 不影响（不入默认模板） | ❌ 不阻塞 |

**Release State:** 任何 AI 能力的引入或移除**不改变** Release State。

---

**v0.4.2 Unity AI Optional Workflow** — AI 辅助生产，SDK 保持纯净。
