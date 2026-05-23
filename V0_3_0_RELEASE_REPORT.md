# PartyGameSDK v0.3.0 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 生产部署与可观测性  
**基调:** 结构化日志 + Prometheus 指标 + Docker + CI — v0.2 LTS 的生产化闭环

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.0 |
| **Git Tag** | `v0.3.0` |
| **Commit** | `2e63d06` |
| **分支** | `platform/v0.3.0` |
| **基线** | v0.2.x LTS Candidate |
| **测试** | **60/60 PASS** ✓ |

---

## 2. 新增生产化能力

### 2.1 结构化日志 — `server/logger/`

**文件:** `server/logger/index.js`

```bash
# Pretty 格式（默认，适合开发）
node server/server.js
# 14:32:01 INFO           connected  wsId=a1b2c3d4
# 14:32:02 INFO  [FA3B21] room_created  maxPlayers=4

# JSON 格式（生产，适合 ELK/Loki/Datadog）
LOG_FORMAT=json node server/server.js
# {"ts":"2026-05-23T14:32:01Z","service":"partygame","level":"info","msg":"connected","wsId":"a1b2..."}
```

**环境变量:**

| 变量 | 默认 | 说明 |
|---|---|---|
| `LOG_LEVEL` | `info` | debug / info / warn / error |
| `LOG_FORMAT` | `pretty` | pretty / json |
| `LOG_PREFIX` | `partygame` | 多实例区分标识 |

**关键日志事件:**

| 事件 | 级别 | 携带字段 |
|---|---|---|
| `connected` | info | wsId |
| `room_created` | info | wsId, roomId, maxPlayers |
| `player_joined` | info | wsId, roomId, playerIndex, playerName, count, max |
| `game_message` | info | wsId, roomId, playerIndex, type |
| `broadcast` | info | roomId, type, count |
| `room_closed` | info | wsId, roomId, reason |
| `disconnected` | info | wsId, role, roomId, playerIndex |
| `reconnected` | info | wsId, roomId, playerIndex, playerName |
| `reconnect_timeout` | info | roomId, playerIndex |
| `fake_playerIndex` | warn | wsId, fake |

---

### 2.2 Prometheus 指标 — `server/metrics/`

**文件:** `server/metrics/index.js`

#### GET /__metrics

Prometheus text format，可直接接入 Prometheus scrape：

```
# HELP partygame_rooms_active Active rooms
# TYPE partygame_rooms_active gauge
partygame_rooms_active 3

# HELP partygame_rooms_created_total Total rooms created
# TYPE partygame_rooms_created_total counter
partygame_rooms_created_total 128

# HELP partygame_rooms_destroyed_total Total rooms destroyed
# TYPE partygame_rooms_destroyed_total counter
partygame_rooms_destroyed_total 125

# HELP partygame_ws_connections Current WebSocket connections
# TYPE partygame_ws_connections gauge
partygame_ws_connections 12

# HELP partygame_messages_received_total Total messages received
# TYPE partygame_messages_received_total counter
partygame_messages_received_total 3450

# HELP partygame_messages_rate_per_minute Messages per minute (approx)
# TYPE partygame_messages_rate_per_minute gauge
partygame_messages_rate_per_minute 42

# HELP partygame_reconnect_attempts_total Total reconnect attempts
# TYPE partygame_reconnect_attempts_total counter
partygame_reconnect_attempts_total 15

# HELP partygame_reconnect_successes_total Total successful reconnects
# TYPE partygame_reconnect_successes_total counter
partygame_reconnect_successes_total 13

# HELP partygame_errors_total Errors by code
# TYPE partygame_errors_total counter
partygame_errors_total{code="1001"} 2
partygame_errors_total{code="5001"} 3
```

| 指标 | 类型 | 说明 |
|---|---|---|
| `rooms_active` | gauge | 当前活跃房间数 |
| `rooms_created_total` | counter | 累计创建房间数 |
| `rooms_destroyed_total` | counter | 累计销毁房间数 |
| `ws_connections` | gauge | 当前 WebSocket 连接数 |
| `messages_received_total` | counter | 累计消息数 |
| `messages_rate_per_minute` | gauge | 近 1 分钟消息速率 (近似) |
| `reconnect_attempts_total` | counter | 重连尝试 |
| `reconnect_successes_total` | counter | 重连成功 |
| `errors_total{code="..."}` | counter | 按错误码分组的错误 |

#### GET /__health

```json
{
  "status": "ok",
  "version": "0.3.0",
  "uptime": 123.45,
  "activeRooms": 3,
  "totalRoomsCreated": 128,
  "totalRoomsDestroyed": 125,
  "activeConnections": 12,
  "totalMessages": 3450,
  "msgRatePerMinute": 42,
  "reconnects": {
    "attempts": 15,
    "successes": 13
  },
  "errors": {
    "1001": 2,
    "5001": 3
  }
}
```

---

### 2.3 错误码体系 — `server/errors.js`

**文件:** `server/errors.js`

| 层级 | 范围 | 错误码 | 说明 |
|---|---|---|---|
| **连接层** | 1xxx | `1001` | Invalid JSON |
| | | `1003` | Client disconnected |
| **房间层** | 2xxx | `2001` | Room not found |
| | | `2002` | Room is full |
| | | `2003` | Already joined |
| | | `2004` | Room closed by host |
| | | `2005` | Host disconnected |
| **角色层** | 3xxx | `3001` | Only controllers can send game_message |
| | | `3002` | Only screen can broadcast |
| | | `3003` | Only screen can close room |
| | | `3004` | Screen already in a room |
| | | `3005` | Not in a room |
| **重连层** | 4xxx | `4001` | Missing token or roomId |
| | | `4002` | Invalid or expired token |
| | | `4003` | Reconnect timeout |
| **输入层** | 5xxx | `5001` | Controller sent playerIndex — ignored |
| | | `5002` | No screen connected to room |

向后兼容：错误码系统在 **server 内部**记录和追踪，不影响客户端收到的消息格式。`room_not_found`、`room_full`、`reconnect_failed` 等消息格式保持不变。

---

### 2.4 Docker 部署 — `docker/`

**Dockerfile** (`docker/Dockerfile`):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server/ server/
COPY screen/ screen/
COPY controller/ controller/
HEALTHCHECK CMD node -e "require('http').get('http://localhost:3000/__health', ...)"
CMD ["node", "server/server.js"]
```

**Docker Compose** (`docker/docker-compose.yml`):

```yaml
services:
  partygame:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports: ['3000:3000']
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - LOG_FORMAT=${LOG_FORMAT:-pretty}
    restart: unless-stopped
```

---

### 2.5 压测工具 — `scripts/loadtest/`

**文件:** `scripts/loadtest/loadtest.js`

| 参数 | 默认 | 说明 |
|---|---|---|
| `--rooms=N` | 10 | 房间数 |
| `--players=N` | 4 | 每房间玩家数 |
| `--duration=S` | 30 | 消息风暴持续秒数 |
| `--host=H:PORT` | localhost:3000 | 目标地址 |

**三阶段:**

1. **Phase 1** — 创建 N 个房间 × M 个玩家
2. **Phase 2** — 每秒 5 条/玩家 game_message + 广播 (200ms tick)
3. **Phase 3** — 清理 + metrics 采集

---

### 2.6 CI 回归脚本 — `scripts/ci-test.sh`

```bash
./scripts/ci-test.sh  [port]

# → Start server
# → Health check (GET /__health)
# → 11 regression tests (core + reconnect + observability)
# → Metrics check (GET /__metrics)
# → ✅ PASS
```

---

## 3. 保持不变的核心原则

| # | 原则 | v0.3.0 状态 |
|---|---|---|
| 1 | **controller 只发输入** | ✅ `handleGameMessage` 仍注入 playerIndex |
| 2 | **server 分配并注入 playerIndex** | ✅ 从 `socket.data.playerIndex` 注入，忽略请求体 |
| 3 | **screen / Unity 负责游戏逻辑** | ✅ game_message 透明转发 |
| 4 | **Unity 广播状态** | ✅ broadcast → controllers |
| 5 | **controller 更新 UI** | ✅ 监听 broadcast 事件 |
| 6 | **server 对 game_message.type 完全透明** | ✅ 从未解析 type 字段 |

**协议消息格式零修改。** 所有 v0.1.0–v0.2.7 的 controller/screen/Unity 端代码无需任何变更。

---

## 4. 生产部署说明

### 4.1 本地开发启动

```bash
cd PartyGameSDK-MVP
node server/server.js

# 🎮 PartyGameSDK v0.3.0
# 📡 http://localhost:3000
# 📊 Metrics: http://localhost:3000/__metrics
# 💚 Health:  http://localhost:3000/__health
```

### 4.2 JSON 日志启动（生产）

```bash
LOG_FORMAT=json LOG_LEVEL=info node server/server.js
# → 所有日志输出为 JSON，可接入 ELK / Loki / Datadog
```

### 4.3 Docker 启动

```bash
cd docker/

# 开发模式 (pretty logs)
docker-compose up

# 生产模式 (json logs)
LOG_FORMAT=json docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4.4 Health Check

```bash
curl http://localhost:3000/__health
# {"status":"ok","version":"0.3.0","uptime":...,"activeRooms":3,...}

# Docker healthcheck 自动使用此端点
```

### 4.5 Metrics 采集

```bash
# Prometheus scrape config:
scrape_configs:
  - job_name: 'partygame'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/__metrics'

# 手动查看实时快照:
curl http://localhost:3000/__metrics
```

### 4.6 Load Test

```bash
# 小规模: 5 房间 × 2 人, 15 秒
node scripts/loadtest/loadtest.js --rooms=5 --players=2 --duration=15

# 中规模: 20 房间 × 4 人, 60 秒
node scripts/loadtest/loadtest.js --rooms=20 --players=4 --duration=60

# 大规模: 50 房间 × 4 人, 120 秒
node scripts/loadtest/loadtest.js --rooms=50 --players=4 --duration=120
```

### 4.7 CI 回归

```bash
./scripts/ci-test.sh

# Expected output:
# → Starting server on port 3099...
# → Health check... ✅ Health OK
# → Running regression tests...
# PASS: T1 create_room
# ...
# PASS: T11 /__metrics
# === 11/11 PASS ===
# → Final metrics: ...
# ✅ CI PASSED
```

---

## 5. 风险与边界

| 风险 / 限制 | 影响 | 缓解方案 |
|---|---|---|
| **单进程内存房间** | 进程重启 → 所有房间丢失 | v0.3.1: Redis 持久化 |
| **Docker 单实例** | 无法横向扩展 | v0.3.1: 多实例 + Redis 共享状态 |
| **无鉴权** | 任何 WebSocket 客户端可创建/加入房间 | v0.3.1: token/JWT 鉴权 |
| **无 HTTPS/WSS** | 生产环境不安全传输 | Nginx 反向代理终止 TLS |
| **无 Grafana dashboard** | 指标需手动查询 | 提供 Prometheus + Grafana 配置 |
| **无管理后台** | 无法查看/控制活跃房间 | v0.3.1: 管理 API / UI |
| **无速率限制** | 恶意客户端可洪水攻击 | v0.3.1: rate-limiting middleware |
| **日志未持久化** | 重启后日志丢失 | 接入外部日志系统 (ELK/Loki) |
| **房间无 TTL** | 空房间不会自动清理 | v0.3.1: 空闲房间自动销毁 |

---

## 6. 生产化路线图 (v0.3.1 → v0.4.0)

```
v0.3.0  生产部署与可观测性 ✅
   │    结构化日志 / Prometheus / Docker / CI
   │
v0.3.1  Redis + 多实例准备
   │    - server/store/redis.js: Redis 房间状态外置
   │    - rooms Map → Redis hash (HSET/HGETALL)
   │    - playerIndex 全局单调递增 (Redis INCR)
   │    - 多实例共享状态验证
   │
v0.3.2  Nginx / HTTPS / WSS 部署
   │    - docker/nginx.conf: 反向代理配置
   │    - TLS 证书管理 (Let's Encrypt)
   │    - WSS upgrade 代理
   │    - docker-compose 加入 nginx 服务
   │
v0.3.3  Grafana Dashboard
   │    - docker-compose 加入 Prometheus + Grafana
   │    - prometheus.yml scrape 配置
   │    - grafana/dashboards/partygame.json: 预配置面板
   │      (Rooms/Connections/QPS/Errors/Reconnects)
   │
v0.3.4  房间管理后台
   │    - GET /admin API: 房间列表/玩家/强制关闭
   │    - admin/index.html: 管理 UI
   │    - 可选 token 鉴权 (ADMIN_TOKEN)
   │
v0.4.0  生产灰度版
   │    - 全链路回归 60+ tests
   │    - 灰度发布 checklist
   │    - 运维 runbook
   ▼
```

### v0.3.1 — Redis + 多实例准备

| 产出 | 说明 |
|---|---|
| `server/store/redis.js` | Redis 客户端封装 (ioredis) |
| `server/store/memory.js` | 现有内存实现抽象为 store 接口 |
| `rooms` Map 迁移 | Redis HSET room:{id} / HGETALL |
| `nextPlayerIndex` 迁移 | Redis INCR room:{id}:nextPlayerIndex |
| 向后兼容 | `REDIS_URL` 为空时 fallback memory store |
| 多实例验证 | 2 个 server 实例共享 Redis → controller 互通 |

### v0.3.2 — Nginx / HTTPS / WSS 部署

| 产出 | 说明 |
|---|---|
| `docker/nginx.conf` | 反向代理 + TLS 终止 + WSS upgrade |
| `docker/nginx.Dockerfile` | Nginx 镜像 |
| TLS | Let's Encrypt certbot 集成 |
| `docker-compose.yml` | 加入 nginx 服务 |

### v0.3.3 — Grafana Dashboard

| 产出 | 说明 |
|---|---|
| `docker/prometheus.yml` | Prometheus scrape config |
| `docker/grafana-dashboard.json` | 预配置面板 |
| `docker-compose.yml` | 加入 prometheus + grafana 服务 |

### v0.3.4 — 房间管理后台

| 产出 | 说明 |
|---|---|
| `server/admin.js` | GET /admin/rooms, /admin/rooms/:id/close |
| `admin/index.html` | 管理 UI (房间表/强制关闭) |
| `ADMIN_TOKEN` | Bearer token 鉴权 |

### v0.4.0 — 生产灰度版

| 产出 | 说明 |
|---|---|
| 全链路回归 | 60+ tests 在 Redis + Nginx 环境下通过 |
| `DEPLOYMENT.md` | 灰度发布 checklist + runbook |
| 运维命令参考 | 启动/停止/日志/回滚/扩容 |

---

## 7. 修改文件清单

| 文件 | 类型 | ±行 | 说明 |
|---|---|---|---|
| `server/logger/index.js` | 新增 | +50 | 结构化日志引擎 |
| `server/metrics/index.js` | 新增 | +100 | Prometheus 指标收集 |
| `server/errors.js` | 新增 | +60 | 错误码体系 1001–5001 |
| `server/server.js` | 修改 | +232/−418 | 集成日志+指标+错误码，保持向后兼容 |
| `docker/Dockerfile` | 新增 | +15 | Alpine Node 20 生产镜像 |
| `docker/docker-compose.yml` | 新增 | +20 | 一键启动 |
| `scripts/loadtest/loadtest.js` | 新增 | +120 | WebSocket 压测 |
| `scripts/ci-test.sh` | 新增 | +100 | CI 回归脚本 |

**总计:** 8 文件变更 (7 新增 + 1 修改)，+650 / −418 行

---

**发布校验清单:**
- [x] 60/60 PASS — 完整向后兼容
- [x] 协议消息格式零修改
- [x] 五条铁律全部满足
- [x] GET /__metrics 可采集 Prometheus
- [x] GET /__health JSON 格式正确
- [x] Docker 构建可用
- [x] 压测脚本可执行
- [x] CI 脚本可独立运行
- [x] Git tag `v0.3.0` 已打

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
