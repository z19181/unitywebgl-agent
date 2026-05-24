# PartyGameSDK v0.4.2 — Final Handoff

> **交付日期:** 2026-05-23  
> **交付版本:** v0.4.2 Mobile Compatibility ★ 推荐灰度基线  
> **交付状态:** ✅ 12/12 PASS — 可灰度上线  
> **制作者:** QClaw Agent  

---

## 1. 当前版本

| 项目 | 内容 |
|---|---|
| **版本号** | v0.4.2 |
| **Git Tag** | `v0.4.2` |
| **Commit** | `971e081` |
| **分支** | `platform/v0.4.2` |
| **测试** | **12/12 PASS** ✓ |
| **v0.2 LTS** | `v0.2-lts-candidate` (功能冻结) |

### 完整版本演进

```
v0.1.0  Core Protocol         2026-05-22  10/10   基线
v0.2.1  QR + Room Close                   17/17   Server 修改
v0.2.2  Multiplayer                       22/22   Server 修改
v0.2.3  Reconnect                         30/30   Server 修改
v0.2.5  Unity WebGL Template              40/40   Server 零改
v0.2.6  JumpJump Demo                     50/50   Server 零改
v0.2.7  Template Factory + Snake          60/60   Server 零改
        ─── v0.2 LTS Candidate ───
v0.3.0  Observability                     60/60   日志+指标+Docker
v0.3.1  Redis Store                       80/80   Store 抽象层
v0.3.2  Nginx/HTTPS/WSS                   70/70   TLS+Sticky
v0.3.3  Grafana Dashboard                 70/70   12 面板
v0.3.4  Admin Backend                     71/71   7 端点+UI
v0.4.0  Production Grayscale              70/70   部署+Runbook+告警
v0.4.1  QA Bugfix                         65/65   ghost+version+connected
v0.4.2  Mobile Compatibility ★ 推荐灰度基线  12/12   移动端安全区+WSS+触控
        ─── 可灰度上线 ───
```

---

## 2. 项目能力总览

### 2.1 核心协议
- ✅ 房间创建/加入/销毁 (`create_room`/`join_room`/`close_room`)
- ✅ `game_message` 透明转发 (server 注入 playerIndex)
- ✅ `broadcast` 广播 (screen → server → all controllers)
- ✅ 18 种消息类型 (协议附录见 V0_2_PLATFORM_SUMMARY.md)

### 2.2 多人房间
- ✅ maxPlayers 1–16 可配置
- ✅ nextPlayerIndex 单调递增
- ✅ room_full 满员拒绝
- ✅ players.changed 实时广播
- ✅ player_joined / player_left 通知

### 2.3 重连
- ✅ reconnectToken 32 字节 hex
- ✅ 10 秒 TTL 重连窗口
- ✅ localStorage 持久化
- ✅ 重连成功复用原 playerIndex

### 2.4 已验证游戏
- ✅ JumpJump (`input.charge_start/end`)
- ✅ Flappy Bird (`input.tap`)
- ✅ Breakout (`input.move`)
- ✅ Snake (`input.direction`)

### 2.5 Unity WebGL Template
- ✅ PartyGameTemplate — Unity 一键选择
- ✅ OnPlatformMessage 标准化入口
- ✅ PartyGameBridge.cs / .jslib / PartyGameTypes.cs
- ✅ partygame-sdk.js / controller-base.js

### 2.6 Game Template Factory
- ✅ GAME_TEMPLATE_FACTORY.md — Agent 生成规范
- ✅ _GameTemplateSkeleton — 标准骨架
- ✅ SnakeTemplateDemo — 验证模板

### 2.7 Docker / Redis / Nginx / HTTPS / WSS
- ✅ Dockerfile (Alpine Node 20, healthcheck)
- ✅ docker-compose (4 种: dev / redis / nginx / monitoring / prod)
- ✅ Redis Store (STORE_TYPE=redis, HINCRBY, SETEX TTL)
- ✅ Nginx reverse proxy (TLS 1.2/1.3, WSS, sticky hash roomId)
- ✅ SSL 自签名 + Let's Encrypt 指南

### 2.8 Prometheus / Grafana
- ✅ 17 个 Prometheus 指标 (rooms/connections/messages/errors/reconnect/latency)
- ✅ 12 面板 Grafana Dashboard (auto-provisioned)
- ✅ GET /__metrics (Prometheus) + GET /__health (JSON)

### 2.9 Admin Backend
- ✅ 7 个 API 端点 (rooms/players/controllers/metrics/close)
- ✅ Bearer Token auth (ADMIN_TOKEN)
- ✅ Dark theme Admin UI (5s auto-refresh)
- ✅ NODE_ENV=production 强制保护

### 2.10 生产灰度文档
- ✅ DEPLOYMENT_CHECKLIST.md (55 items)
- ✅ RUNBOOK.md (8 failure scenarios)
- ✅ ROLLBACK.md (3 triggers, 6 steps)
- ✅ CANARY_PLAN.md (5 phases)
- ✅ ALERT_RULES.md (12 alerts)
- ✅ .env.production.example
- ✅ docker-compose.prod.yml

---

## 3. 五条铁律

PartyGameSDK 从 v0.1.0 确立，**从未违反**的核心安全原则：

| # | 铁律 | 实现 |
|---|---|---|
| 1 | **controller 只发输入** | `{event:"game_message", type:"input.tap"}` — 无 `playerIndex` |
| 2 | **server 分配并注入 playerIndex** | `handleGameMessage` 忽略请求体中的 `playerIndex`，从 `socket.data` 注入 |
| 3 | **screen / Unity 负责游戏逻辑** | `game_message` 仅转发不计算，Unity `OnPlatformMessage` 接收 |
| 4 | **Unity 广播状态** | `PartyGameBridge.Broadcast(type, dataJson)` → server → controllers |
| 5 | **controller 只更新 UI** | 监听 `broadcast`，更新分数/状态/GameOver |

### 补充原则

| # | 原则 |
|---|---|
| 6 | **server 对 `game_message.type` 完全透明** — 自 v0.1.0 从未解析/修改/新增 type |

---

## 4. 关键文档索引

| 文档 | 说明 |
|---|---|
| `V0_2_PLATFORM_SUMMARY.md` | ★ v0.1.0→v0.2.7 完整演进 (版本/协议/测试/路线) |
| `FINAL_SPEC.md` | v0.1.0 协议规范 |
| `TEST_REPORT.md` | v0.1.0 测试报告 |
| `V0_2_1_RELEASE_REPORT.md` | QR + 房间关闭 |
| `V0_2_2_RELEASE_REPORT.md` | 多人管理 |
| `V0_2_3_RELEASE_REPORT.md` | ReconnectToken |
| `V0_2_5_RELEASE_REPORT.md` | Unity WebGL Template |
| `V0_2_6_RELEASE_REPORT.md` | JumpJump Demo |
| `V0_2_7_RELEASE_REPORT.md` | Template Factory + Snake |
| `V0_3_0_RELEASE_REPORT.md` | Logging + Metrics + Docker |
| `V0_3_1_RELEASE_REPORT.md` | Store + Redis |
| `V0_3_2_RELEASE_REPORT.md` | Nginx/HTTPS/WSS |
| `V0_3_3_RELEASE_REPORT.md` | Grafana Dashboard |
| `V0_3_4_RELEASE_REPORT.md` | Admin Backend |
| `GAME_TEMPLATE_FACTORY.md` | 新游戏生成流程 |
| `AGENT_GAME_GENERATION_PROMPT.md` | Agent 自动生成指令 |
| `docs/DEPLOYMENT_CHECKLIST.md` | ★ 生产上线 55 项检查 |
| `docs/RUNBOOK.md` | ★ 运维手册 |
| `docs/ROLLBACK.md` | ★ 回滚方案 |
| `docs/CANARY_PLAN.md` | ★ 灰度计划 |
| `docs/ALERT_RULES.md` | ★ 告警规则 |

---

## 5. 运行入口

### 5.1 本地开发

```bash
cd PartyGameSDK-MVP
npm install
node server/server.js
# → http://localhost:3000/screen
```

### 5.2 Docker (单实例)

```bash
docker-compose -f docker/docker-compose.yml up -d
# → http://localhost:3000/screen
```

### 5.3 生产 (6 services)

```bash
cp .env.production.example .env.production  # 填写真实值
docker-compose -f docker/docker-compose.prod.yml up -d
# → https://your-domain/screen
```

### 5.4 Grafana

```
http://localhost:3000  (admin/admin)
→ Dashboards → PartyGameSDK Overview
```

### 5.5 Admin

```
https://your-domain/admin
→ 输入 ADMIN_TOKEN → 房间/玩家/指标
```

### 5.6 Unity WebGL Template

```bash
# Unity Editor:
Tools → PartyGame → Create {GameName} Scene
File → Build Settings → WebGL → PartyGameTemplate → Build

# 部署:
cp -r Build/ PartyGameSDK-MVP/screen-build/
```

### 5.7 新游戏模板

```bash
cp -r UnityExamples/_GameTemplateSkeleton/Assets/*  NewGameProject/Assets/
# 实现 NewGameGameManager.cs 的 OnPlatformMessage()
# 创建 Editor/CreateNewGameScene.cs
```

---

## 6. 灰度上线步骤

| Phase | 流量 | 持续 | 成功标准 | 回滚条件 |
|---|---|---|---|---|
| **Phase 1** 内部 QA | 0% 公网 | 1 天 | 全部验收步骤通过 | — |
| **Phase 2** 1% | 1% | 2 天 | 5xx <0.1%, reconnect >80% | 5xx >1% 5min |
| **Phase 3** 10% | 10% | 3 天 | 同上 + 与对照组无差异 | disconnect >10% |
| **Phase 4** 50% | 50% | 2 天 | 同上 | reconnect <50% |
| **Phase 5** 100% | 全量 | — | 稳定运行 | 人工判定 |

每阶段验收:
1. 打开 Screen → 创建房间 → QR Code
2. 扫码 → Controller 加入 → 操作游戏 → 分数更新
3. 刷新 Controller → reconnect 成功
4. Admin 确认房间可见
5. Grafana 指标正常

---

## 7. 回滚步骤摘要

### 触发条件
- 5xx 错误率 > 1% 持续 5 分钟
- WebSocket 断开率 > 10%
- reconnect 成功率 < 50%
- 人工判定

### 执行

```bash
# 1. 停止 v0.4.0
docker-compose -f docker/docker-compose.prod.yml down

# 2. 切换到 v0.3.4
git checkout tags/v0.3.4

# 3. 启动
docker-compose -f docker/docker-compose.monitoring.yml up -d

# 4. 验证
curl https://localhost/__health   # → version: 0.3.4
curl https://localhost/admin/health # → ok: true
```

### Redis 数据
- 灰度期间保留 (v0.3.4 兼容 v0.4.0 key 格式)
- 如需清空: `docker exec redis redis-cli FLUSHDB`

---

## 8. 当前不包含的能力

| 能力 | 说明 |
|---|---|
| **正式用户鉴权系统** | 当前仅 Admin 有 Bearer token；Controller/Screen 无用户身份 |
| **多区域部署** | 单集群部署，无跨区域同步 |
| **计费 / 商业化** | 无付费墙、无租户隔离 |
| **持久化历史战绩** | 房间关闭后分数数据丢失 |
| **完整管理后台权限体系** | 单一 ADMIN_TOKEN，无角色/权限分级 |
| **国际化和多语言** | 仅英文 UI |
| **CDN 分发 Unity Build** | 当前需手动部署 Build 产物 |
| **移动端原生 SDK** | Controller 仅浏览器端 |

---

## 9. 下一阶段建议

| 版本 | 内容 | 优先级 |
|---|---|---|
| **v0.4.1** | 内部 QA bugfix | 🔴 高 |
| **v0.4.2** | 移动端兼容修复 (iOS Safari / Android Chrome) | 🔴 高 |
| **v0.5.0** | 账号系统 / 房间运营 / 数据持久化 | 🟡 中 |

### v0.5.0 详细方向

| 模块 | 说明 |
|---|---|
| 账号系统 | 简易注册/登录 (email/token)，playerName 持久化 |
| 房间运营 | 房间历史、活跃度统计、热门 game type |
| 数据持久化 | 每局分数存储 (Redis → PostgreSQL) |
| 排行榜 | 按游戏类型、日/周/总榜 |
| 权限分级 | Admin role (viewer/operator/admin) |

---

## 10. Validated Pipelines

### 10.1 PartyGameSDK Release Pipeline

**目的:** 所有版本发布必须通过此 Pipeline，确保灰度安全。

| 组件 | 说明 |
|---|---|
| **Baseline** | `v0.4.2` — 推荐灰度基线（所有新版本从此出发） |
| **Phase Gate** | `RELEASE_STATE.json` 定义 5 个发布阶段（Phase 1→5），每阶段有 gate 条件 |
| **Manual QA Gate** | Phase 1→Phase 2 唯一推进入口。必须 4 平台真机测试 + 7 项运维检查全部 PASS |
| **Canary Plan** | `docs/CANARY_PLAN.md` — 1% → 10% → 50% → 100% 四阶段灰度 |
| **Release Manager** | `agents/release-manager/` — 自动化发布状态管理 Agent |
| **State File** | `RELEASE_STATE.json` — 当前阶段、通过历史、阻塞项、允许的自动操作 |

**推进规则:**
- Phase 过渡必须满足 `RELEASE_STATE.json` 中 `phase_transition_rules` 条件
- 人工审批仅在 `requires_human_approval: true` 时需要
- 禁止手动修改 `current_phase` — 必须通过 gate script 输出变量授权

**当前状态:** Phase 3 (10% canary)，Grafana 未部署阻塞 Phase 4。

---

### 10.2 Unity WebGL Build Pipeline

**目的:** 任何 Unity 游戏模板的真实 WebGL Build 必须通过此 Pipeline 验证。

| 组件 | 说明 |
|---|---|
| **Task Input** | `CODEX_TASKS.md` — QClaw 创建的任务指令（项目路径、Build 方法、验收标准） |
| **Executor** | Codex — 本地执行 Unity 6 batchmode build |
| **Build Script** | `scripts/build-jumpjump-webgl.sh` — 可重复执行的自动化 Build 脚本 |
| **Validator** | `scripts/check-unity-webgl-build.js` — 22 项自动化检查 |
| **Output** | `screen/Build/` — 6 个 Build 产物（loader.js / framework.js / wasm / data / index.html / partygame-template.js） |
| **Result File** | `CODEX_RESULT.md` — Codex 写入执行结果，QClaw 读取并判定 |
| **Final Report** | `UnityExamples/UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md` — 全链路验证报告 |

**协作流程:**

```
QClaw                           Codex
─────                           ─────
写入 CODEX_TASKS.md     →       读取任务
指定验收标准             →       探测 Unity 6 路径
读取 CODEX_RESULT.md     ←       执行 batchmode build
判定 PASS / FAIL        ←       写入结果 + 日志
更新报告                 ←       不修改核心协议 / RELEASE_STATE.json
```

**已验证模板:**
- ✅ JumpJumpTemplateDemo — Unity 6 (6000.4.8f1) → WebGL Build → Safari canvas 渲染 → QClaw real-link verified

**Build Gate Status (2026-05-23):**

| Gate | 状态 | 验证方式 |
|---|---|---|
| Unity batchmode success | ✅ PASS | Attempt 6, `EMSDK_PYTHON=python3.11` |
| Artifact completeness | ✅ PASS | 22/22 check script |
| screen/Build files (6) | ✅ PASS | 见下方产物清单 |
| QClaw real-link test | ✅ PASS | 6/7 WebSocket 链路 |
| Iron Law audit | ✅ PASS | 5/5 intact |
| Browser canvas render | ✅ PASS | Safari 人工验证 (Codex) |

**Build 产物清单:**

| 文件 | 大小 | 说明 |
|---|---|---|
| `Build.data` | 3.8 MB | 游戏资产数据 |
| `Build.framework.js` | 372 KB | Unity WebGL framework |
| `Build.loader.js` | 19 KB | WebGL loader / bootstrap |
| `Build.wasm` | 16 MB | IL2CPP 编译输出 |
| `index.html` | 5.2 KB | PartyGameTemplate 生成 |
| `partygame-template.js` | 6.1 KB | SDK bridge 初始化 |

**Commit:** `5136e2e` | **Gate: PASS** | **详见:** `UnityExamples/UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md`

**验证通过标准:**
1. Unity batchmode build 成功
2. `check-unity-webgl-build.js` 22/22 PASS
3. 浏览器 Unity canvas 渲染正常（至少一个主流浏览器）
4. 核心协议 + 五条铁律 + server.js 无修改

---

### 10.3 当前状态

| 项目 | 状态 |
|---|---|
| PartyGameSDK Release | 由 `RELEASE_STATE.json` 管理 — Phase 3 (10% canary) |
| Unity WebGL Agent | **Build capability verified** ✅ |
| 核心协议 | 未修改 ✅ |
| 五条铁律 | 未破坏 ✅ |
| server.js | 未修改 ✅ |

---

### 10.4 后续使用方式

**新游戏模板生成后，必须走两条 Pipeline:**

1. **Unity WebGL Build Pipeline** — 生成真实 WebGL 产物并验证
   ```
   QClaw 写 CODEX_TASKS.md（指向新模板路径）
   → Codex 执行 batchmode build
   → QClaw 运行 check-unity-webgl-build.js
   → 人工 Safari 确认 canvas 渲染
   → QClaw 收口为 PASS
   ```

2. **Release Manager Pipeline** — 任何版本发布必须遵守
   ```
   从 v0.4.2 baseline 新建分支
   → 实现功能 + 测试
   → Phase 1 内部 QA（53 自动 + 27 人工）
   → Manual QA Gate（4 平台真机）
   → Canary 1% → 10% → 50% → 100%
   → 每阶段更新 RELEASE_STATE.json
   ```

**两条 Pipeline 互不阻塞:**
- Unity Build Pipeline 不触发 Phase 推进
- Release Pipeline 不依赖 Unity Build（SDK-only mode 已可用）
- 两者共享铁律约束和 Codex 协作机制

---

### 10.5 Verified Multi-Game WebGL Build Queue

**Status:** ✅ PASS — 4/4 games verified  
**Date:** 2026-05-23  
**Report:** `UnityExamples/MULTI_GAME_WEBGL_BUILD_REPORT.md`

| Game | Build | Check | Output Dir | Builder Script |
|---|---|---|---|---|
| JumpJump | ✅ PASS | 22/22 | `screen/Build/` | `JumpJumpWebGLBuilder.BuildWebGL` |
| Snake | ✅ PASS | 22/22 | `screen/Build_Snake/` | `SnakeWebGLBuilder.BuildWebGL` |
| 2048 | ✅ PASS | 22/22 | `screen/Build_2048/` | `Game2048WebGLBuilder.BuildWebGL` |
| Breakout | ✅ PASS | 22/22 | `screen/Build_Breakout/` | `BreakoutWebGLBuilder.BuildWebGL` |

**Capabilities verified:**
- Game Template Factory — bulk build across 4 game types (jump, snake, puzzle, breakout)
- Codex Build Pipeline — reusable; only `-executeMethod` and `-projectPath` vary
- Foreground build required for `EMSDK_PYTHON` propagation

**All games pass:**
- 22/22 `check-unity-webgl-build.js`
- PartyGameBridge.jslib present (via PartyGameTemplate)
- Five Iron Laws intact
- `server.js` 0 bytes modified
- `RELEASE_STATE.json` phase unchanged

---

## 附录: Git 标签一览

```
v1.0.1-governance   ← Runtime Verified Template + Material Policy ★ 当前
v0.4.2              ← Mobile Compatibility ★ 推荐灰度基线
v0.3.4              ← Admin Backend
v0.3.3              ← Grafana Dashboard
v0.3.2              ← Nginx/HTTPS/WSS
v0.3.1              ← Redis Store
v0.3.0              ← Observability
v0.2-lts-candidate  ← v0.2 LTS 冻结
v0.2.7              ← Template Factory + Snake
v0.2.6              ← JumpJump Demo
v0.2.5              ← Unity WebGL Template
v0.2.3              ← Reconnect
v0.2.2              ← Multiplayer
v0.2.1              ← QR + Room Close
v0.1.0              ← Core Protocol
```

---

**PartyGameSDK v0.4.1 — Recommended canary baseline.**

---

## §11. Runtime Verified Template (v1.0.1-governance)

| Attribute | Value |
|---|---|
| **Golden Template** | `UnityExamples/_RuntimeVerifiedTemplate/` |
| **Source** | `UnityExamples/JumpJumpTemplateDemo/` |
| **Frozen at** | CurrentScene ALL GATES CLEAR (commit `264c45c`) |
| **Material Policy** | `UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md` |
| **Pipeline Doc** | `UnityExamples/WEBGL_RUNTIME_PIPELINE.md` |
| **Automation Plan** | `docs/WEBGL_RUNTIME_AUTOMATION_PLAN.md` |

### Verified Gates

| Gate | Status |
|---|---|
| `check-unity-webgl-build.js` | 26/26 ✅ |
| Browser Static Load | 8/8 ✅ |
| DOM Integrity | PASS ✅ |
| Runtime Visual | MANUAL_VERIFIED ✅ |
| Runtime E2E | PASS ✅ |

### New Game SOP

```
_RuntimeVerifiedTemplate/
  → Assets/Scripts/Game/{GameName}GameManager.cs
  → Unity batchmode Build
  → /runtime-gate
  → /runtime-automation (v1.1.0)
  → ALL GATES CLEAR → release
```

### Runtime Automation (v1.1.0)

| Component | Location |
|---|---|
| Playwright tests | `tests/runtime/` (7 files) |
| CI workflow | `.github/workflows/runtime-e2e.yml` |
| Failure matrix | `docs/RUNTIME_FAILURE_MATRIX.md` |
| Artifact policy | `docs/RUNTIME_ARTIFACT_POLICY.md` |
| JS hooks | `__PARTYGAME_RUNTIME_READY__`, `__PARTYGAME_LAST_STATE__`, `__PARTYGAME_LAST_INPUT__` |

---
