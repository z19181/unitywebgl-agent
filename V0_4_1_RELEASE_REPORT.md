# PartyGameSDK v0.4.1 发布报告

**发布日期:** 2026-05-23  
**版本类型:** QA Bugfix — 内部 QA 发现修复  
**基调:** Ghost player 清理 + 版本管理 + 监控精度

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.4.1 |
| **Git Tag** | `v0.4.1` |
| **Commit** | `1828802` |
| **分支** | `platform/v0.4.1` (从 `release/v0.4.0` 新建) |
| **测试** | **65/65 PASS** ✓ |
| **推荐部署版本** | **v0.4.1** (取代 v0.4.0) |

---

## 2. 修复列表

| ID | Severity | Bug | 修复 | 测试 |
|---|---|---|---|---|
| **BUG-001** | 🔴 High | **Ghost players stuck forever after disconnect** | `handleDisconnect` 中添加 `setTimeout(RECONNECT_TTL)` — TTL 后如果 `socketId` 未变化（未重连），调用 `store.removePlayer()` 清理 | ✅ T1 |
| **BUG-002** | 🟡 Medium | **handleDisconnect errors swallowed** | `ws.on('close', ...)` 中包裹 `try/catch`，失败时输出 `log.error` 而非静默崩溃 | ✅ (60 回归) |
| **BUG-003** | 🟢 Low | **Hardcoded version `0.3.1`** | 所有 `version` 字符串改为动态读取 `APP_VERSION` 环境变量或 `package.json`；影响 `/__health`、`/admin/health`、启动日志 | ✅ T2, T5 |
| **POLISH-001** | 🟢 Low | **console.log 启动 banner** | 替换为 `log.info('banner', ...)`，兼容 JSON 日志格式 | ✅ |
| **POLISH-002** | 🟢 Info | **Admin 不区分连接/幽灵玩家** | `/admin/rooms` 新增 `connectedPlayerCount` 字段；Admin UI 可准确显示活跃玩家数 | ✅ T3, T4 |

---

## 3. 关键行为变更

### 3.1 Ghost Player 清理流程

```
玩家断线
  └→ store.deletePlayerSocket()      // 移除 socket 映射
  └→ broadcast player_left            // 通知游戏逻辑
  └→ setTimeout(RECONNECT_TTL)        // 启动清理倒计时
       ├─ 10s 内重连成功                → socketId 变化，跳过清理
       └─ 10s 后未重连                  → store.removePlayer() + broadcast players.changed
```

### 3.2 Admin 玩家计数

```
Before: playerCount = 3  (无法区分 3 个在线还是 1 在线 + 2 幽灵)
After:  playerCount = 3
        connectedPlayerCount = 1  ← 实际在线
```

### 3.3 版本管理

```bash
# 环境变量（最高优先级）
APP_VERSION=v0.4.1 node server/server.js

# 默认：从 package.json 读取
node server/server.js    # → version: "1.0.0"

# /__health 和 /admin/health 均返回动态版本
curl http://localhost:3000/__health   # → { version: "v0.4.1" }
```

---

## 4. 测试结果

### v0.4.0 回归 (60/60)

| 套件 | 内容 | 结果 |
|---|---|---|
| A | v0.2.1 基线 (10) | ✅ |
| B | v0.2.2 多人 (12) | ✅ |
| C | v0.2.3 重连 (8) | ✅ |
| D | v0.2.5 模板 (10) | ✅ |
| E | v0.2.6 JumpJump (10) | ✅ |
| F | v0.2.7 Template Factory + Snake (10) | ✅ |

### Bugfix 专项 (5/5)

| ID | 测试 | ✅ |
|---|---|---|
| T1 | Ghost player cleaned after RECONNECT_TTL | ✅ |
| T2 | Health version dynamic (not 0.3.1) | ✅ |
| T3 | Admin rooms has connectedPlayerCount | ✅ |
| T4 | Reconnect shows connected in admin | ✅ |
| T5 | Admin /admin/health version dynamic | ✅ |

### 总计: **65/65 PASS, 0 FAIL** ✅

---

## 5. 灰度版本更新

| 项目 | 旧值 | 新值 |
|---|---|---|
| **推荐灰度版本** | v0.4.0 | **v0.4.1** |
| **原因** | — | v0.4.0 存在 BUG-001 (ghost player 残留)，长期运行会导致房间玩家数膨胀。v0.4.1 修复后适合作为内部 QA / 1% 灰度基线。 |
| **回滚目标** | v0.3.4 | v0.3.4（不变） |

---

## 6. 修改文件清单

| 文件 | 变更 |
|---|---|
| `server/server.js` | BUG-001 (ghost cleanup), BUG-002 (error handling), BUG-003 (version), POLISH-001 (console→log) |
| `server/admin.js` | BUG-003 (version), POLISH-002 (connectedPlayerCount) |
| `server/metrics/index.js` | (no changes from v0.3.4 fix) |
| `docs/QA_BUGFIX_LOG.md` | 新增 — 完整 bugfix 记录 |
| `PARTY_GAME_SDK_FINAL_HANDOFF.md` | 更新推荐版本 v0.4.0→v0.4.1 |
| `docs/CANARY_PLAN.md` | 更新基线版本 |
| `docs/DEPLOYMENT_CHECKLIST.md` | 更新版本引用 |
| `README.md` | 更新推荐部署版本 |

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
