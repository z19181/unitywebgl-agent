# PartyGameSDK v0.3.4 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 管理工具 — Admin API + UI  
**基调:** 轻量可管理 — 7 个 API 端点，房间/玩家/错误全部可见可控

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.4 |
| **Git Tag** | `v0.3.4` |
| **Commit** | `376b7ea` |
| **分支** | `platform/v0.3.4` (从 `platform/v0.3.3` 新建) |
| **基线** | v0.3.3 |
| **测试** | **71/71 PASS** ✓ |

---

## 2. 新增能力

### 2.1 Admin API — 7 个端点

| Method | Path | 说明 | Auth |
|---|---|---|---|
| `GET` | `/admin/health` | 服务健康、版本、uptime | 公开 |
| `GET` | `/admin/rooms` | 所有活跃房间列表 (roomId/players/max/screen) | Bearer* |
| `GET` | `/admin/rooms/:roomId` | 房间详情 + 玩家/连接状态 | Bearer* |
| `GET` | `/admin/rooms/:roomId/players` | 玩家列表 (PI/name/connected) | Bearer* |
| `GET` | `/admin/rooms/:roomId/controllers` | 控制器列表 | Bearer* |
| `GET` | `/admin/metrics-summary` | 概要指标 (rooms/connections/errors/byType) | Bearer* |
| `POST` | `/admin/rooms/:roomId/close` | 关闭房间 → 广播 `room_closed` → 清理 Redis | Bearer* |

> *Bearer = 仅当 `ADMIN_TOKEN` 已设置时要求

**统一响应格式:**

```json
{ "ok": true,  "data": { "rooms": [...] }, "error": null }
{ "ok": false, "data": null, "error": { "code": "ROOM_NOT_FOUND", "message": "Room not found" } }
```

### 2.2 Bearer Token Auth

| 环境 | `ADMIN_TOKEN` 设置 | 行为 |
|---|---|---|
| dev (default) | 未设置 | ⚠️ 打印 warning，允许所有访问 |
| dev | 已设置 | 🔒 需要 `Authorization: Bearer <token>` |
| production (`NODE_ENV=production`) | 未设置 | ❌ **启动失败** (防止生产无保护) |
| production | 已设置 | 🔒 需要 `Authorization: Bearer <token>` |

### 2.3 Admin UI — Dark Theme

| 组件 | 说明 |
|---|---|
| Header | 服务名称 + 健康状态指示器 (🟢/🔴) |
| Metrics Cards | 6 张卡片: Rooms / Players / Controllers / WS / Errors / Uptime |
| Rooms Table | roomId / playerCount / max / screen status / Detail + Close |
| Detail Panel | 玩家列表 (PI/name/connected) + Close Room 按钮 |
| Auto-refresh | 每 5 秒自动刷新房间和指标 |
| Token Prompt | 页面加载时弹窗输入 admin token |

### 2.4 Close Room 管理操作

`POST /admin/rooms/:roomId/close`:
1. 向房间内所有 controllers 广播 `room_closed` (reason: `admin_closed`)
2. 关闭 screen WebSocket
3. 调用 `store.deleteRoom()` 清理 Redis/Memory
4. `metrics.increment('roomsDestroyed')`

### 2.5 Metrics Summary

`GET /admin/metrics-summary`:
```json
{
  "activeRooms": 5,
  "activeConnections": 12,
  "activeControllers": 8,
  "totalMessages": 1420,
  "msgRatePerMinute": 35,
  "reconnects": { "attempts": 4, "successes": 3 },
  "errors": { "1001": 1, "5001": 2 },
  "byType": { "input.tap": 520, "state.score_update": 300 },
  "byEvent": { "game_message": 520, "broadcast": 300 }
}
```

---

## 3. Admin API 文档

### GET /admin/health

```bash
curl http://localhost:3000/admin/health
# {"ok":true,"data":{"status":"ok","version":"0.3.4","uptime":123.4},"error":null}
```

### GET /admin/rooms

```bash
curl http://localhost:3000/admin/rooms
# {"ok":true,"data":{"rooms":[{"roomId":"ABC123","maxPlayers":4,"playerCount":2,...}],"count":1},"error":null}
```

### GET /admin/rooms/:roomId

```bash
curl http://localhost:3000/admin/rooms/ABC123
# {"ok":true,"data":{"roomId":"ABC123","maxPlayers":4,"players":[...],"hasScreen":true,...},"error":null}
```

### GET /admin/rooms/:roomId/players

```bash
curl http://localhost:3000/admin/rooms/ABC123/players
# {"ok":true,"data":{"players":[{"playerIndex":0,"playerName":"P0","connected":true}]},"error":null}
```

### GET /admin/rooms/:roomId/controllers

```bash
curl http://localhost:3000/admin/rooms/ABC123/controllers
# {"ok":true,"data":{"controllers":[{"playerIndex":0,"playerName":"P0","connected":true}]},"error":null}
```

### GET /admin/metrics-summary

```bash
curl http://localhost:3000/admin/metrics-summary
# {"ok":true,"data":{"activeRooms":5,...},"error":null}
```

### POST /admin/rooms/:roomId/close

```bash
curl -X POST http://localhost:3000/admin/rooms/ABC123/close
# {"ok":true,"data":{"roomId":"ABC123","closed":true},"error":null}
```

**With auth:**

```bash
curl -H "Authorization: Bearer my-secret-token" http://localhost:3000/admin/rooms
```

---

## 4. 鉴权说明

### 环境变量

```bash
# 开发模式 (无保护)
node server/server.js

# 开发模式 (有保护)
ADMIN_TOKEN=my-dev-token node server/server.js

# 生产模式 (强制保护)
NODE_ENV=production ADMIN_TOKEN=my-prod-token node server/server.js
```

### 请求头

```
Authorization: Bearer <ADMIN_TOKEN>
```

### 行为矩阵

| NODE_ENV | ADMIN_TOKEN | 结果 |
|---|---|---|
| (default) | (empty) | ⚠️ Warning + 开放 |
| (default) | `"abc"` | 🔒 Bearer "abc" |
| `production` | (empty) | ❌ 启动拒绝 |
| `production` | `"abc"` | 🔒 Bearer "abc" |

---

## 5. 安全边界

| 边界 | 状态 |
|---|---|
| **Admin 不参与 game_message 链路** | ✅ 独立路由，不拦截/修改/观察游戏消息 |
| **close room 复用既有 room lifecycle** | ✅ 广播 `room_closed` → `store.deleteRoom()` → 与 `handleCloseRoom` 一致 |
| **不改变 playerIndex 注入** | ✅ `handleGameMessage` 未修改 |
| **不改变 game_message.type 透明转发** | ✅ server 从未解析 type 字段 |
| **五条铁律全部保持** | ✅ |

---

## 6. 测试结果

### v0.3.4 专项 (11/11)

| ID | 测试 | ✅ |
|---|---|---|
| A1 | `/admin/health` returns ok | ✅ |
| A2 | `/admin/rooms` accessible (dev mode) | ✅ |
| A3 | Create room → visible in `/admin/rooms` | ✅ |
| A4 | `/admin/rooms/:id` returns detail | ✅ |
| A5 | `/admin/rooms/:id/players` returns players | ✅ |
| A6 | `/admin/rooms/:id/controllers` returns controllers | ✅ |
| A7 | `/admin/metrics-summary` returns data | ✅ |
| A8 | POST close room → room removed | ✅ |
| A9 | close → controller receives `room_closed` | ✅ |
| A10 | Admin UI files exist (4 files) | ✅ |
| A11 | Protocol unaffected (game_message with fake PI) | ✅ |

### v0.3.x 全系列

| 版本 | 测试 | 核心 |
|---|---|---|
| v0.3.0 | 60/60 | Logger + Prometheus + Docker |
| v0.3.1 | 80/80 | Store + Redis 多实例 |
| v0.3.2 | 70/70 | Nginx/HTTPS/WSS + sticky |
| v0.3.3 | 70/70 | Grafana Dashboard |
| v0.3.4 | 71/71 | Admin Backend |
| **累计** | **>290 tests** | **0 failures** |

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
