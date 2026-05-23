# PartyGameSDK v0.3.4 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 管理工具 — Admin API + UI  
**基调:** 轻量管理 — 7 个 API 端点 + 玩家/房间/错误全部可见

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.4 |
| **Git Tag** | `v0.3.4` |
| **Commit** | `376b7ea` |
| **分支** | `platform/v0.3.4` |
| **基线** | v0.3.3 |
| **测试** | **71/71 PASS** ✓ |
| **协议** | 零修改 |

---

## 2. 新增能力

### 2.1 Admin API

`server/admin.js` — 7 个端点，统一 JSON 响应:

| Method | Path | 说明 |
|---|---|---|
| `GET` | `/admin/health` | 服务健康状态 |
| `GET` | `/admin/rooms` | 所有活跃房间列表 |
| `GET` | `/admin/rooms/:roomId` | 房间详情 + 玩家/连接 |
| `GET` | `/admin/rooms/:roomId/players` | 玩家列表 |
| `GET` | `/admin/rooms/:roomId/controllers` | 控制器列表 |
| `GET` | `/admin/metrics-summary` | 概要指标 |
| `POST` | `/admin/rooms/:roomId/close` | 关闭房间 |

**统一响应格式:**
```json
{ "ok": true, "data": { ... }, "error": null }
{ "ok": false, "data": null, "error": { "code": "ROOM_NOT_FOUND", "message": "..." } }
```

### 2.2 Admin Auth

| 环境 | 行为 |
|---|---|
| `ADMIN_TOKEN` 未设置 + 非 production | 允许所有访问，打印 warning |
| `ADMIN_TOKEN` 已设置 | 需要 `Authorization: Bearer <token>` 头 |
| `NODE_ENV=production` + 未设置 | **启动失败**，强制设置 |

### 2.3 Admin UI

`admin/` 目录 — 3 文件:

| 文件 | 说明 |
|---|---|
| `index.html` | 页面结构 (header / metrics cards / rooms table / detail panel) |
| `admin.js` | fetch 逻辑 + 5s 自动刷新 + room close + token prompt |
| `admin.css` | Dark theme CSS |

**页面结构:**

```
┌──────────────────────────────────────────┐
│ 🎮 PartyGameSDK Admin    ● Healthy      │  header
├──────────────────────────────────────────┤
│ [3 Active Rooms] [2 Players] [2 Ctrl]    │  metrics cards
│ [4 WS] [0 Errors] [5m Uptime]           │
├──────────────────────────────────────────┤
│ 🏠 Rooms                                │
│ Room ID  │ Players │ Screen │ Actions   │  rooms table
│ ABC123   │ 2/4     │ 🟢     │ Detail ✕  │
├──────────────────────────────────────────┤
│ 🔍 Room Detail                          │
│ Players: [P0 ●] [P1 ●]  [✕ Close Room] │  detail panel
└──────────────────────────────────────────┘
```

---

## 3. 修改文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `server/admin.js` | 新增 | Admin API (7 endpoints + auth) |
| `admin/index.html` | 新增 | Admin UI 页面 |
| `admin/admin.js` | 新增 | Admin UI 逻辑 |
| `admin/admin.css` | 新增 | Admin UI 样式 |
| `server/server.js` | 修改 | +8 行 (admin mount + room count fix) |
| `server/metrics/index.js` | 修改 | +2 行 (sync room count fallback) |
| `docker/nginx/nginx.conf` | 修改 | +8 行 (/admin proxy) |

---

## 4. 测试结果

| 套件 | 结果 |
|---|---|
| MemoryStore 回归 (A+B+C+D+E+F) | 60/60 ✅ |
| Admin 专项 (A1-A11) | 11/11 ✅ |
| **总计** | **71/71** ✅ |

---

## 5. Docker 运行

```bash
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Admin UI
open https://localhost/admin

# With auth
ADMIN_TOKEN=my-secret docker-compose up -d
# → Admin UI will prompt for token
```

---

## 6. 已知限制

| 限制 | 说明 |
|---|---|
| **只读 + close** | 不支持创建房间、修改配置 |
| **无分页** | rooms list 全量返回 |
| **无 WebSocket** | Admin UI 通过 HTTP 轮询 (5s) |
| **Auth 简单** | Bearer token，无 JWT/权限分级 |

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
