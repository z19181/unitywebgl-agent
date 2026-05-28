# PartyGameSDK v0.4.2 — Deployment Checklist

> 灰度上线前必须逐项确认。每条勾选后再进入下一步。

## 1. 环境变量

| # | 检查项 | 正确值 | ✅ |
|---|---|---|---|
| 1.1 | `NODE_ENV` | `production` | ⬜ |
| 1.2 | `ADMIN_TOKEN` | 32+ 字符随机字符串 | ⬜ |
| 1.3 | `STORE_TYPE` | `redis` | ⬜ |
| 1.4 | `REDIS_URL` | `redis://redis:6379` | ⬜ |
| 1.5 | `LOG_FORMAT` | `json` | ⬜ |
| 1.6 | `LOG_LEVEL` | `info` | ⬜ |
| 1.7 | `SERVER_HOST` | 真实域名 (如 `play.example.com`) | ⬜ |
| 1.8 | `PORT` | `3000` | ⬜ |

## 2. TLS 证书

| # | 检查项 | ✅ |
|---|---|---|
| 2.1 | SSL 私钥 `docker/nginx/ssl/key.pem` 存在 | ⬜ |
| 2.2 | SSL 证书 `docker/nginx/ssl/cert.pem` 存在 | ⬜ |
| 2.3 | 证书指向正确域名 (SERVER_HOST) | ⬜ |
| 2.4 | 证书未过期 (`openssl x509 -enddate -noout -in cert.pem`) | ⬜ |
| 2.5 | Let's Encrypt auto-renew cron 已配置 | ⬜ |

## 3. Nginx

| # | 检查项 | ✅ |
|---|---|---|
| 3.1 | `docker/nginx/nginx.conf` 已配置 | ⬜ |
| 3.2 | WebSocket Upgrade headers 已配置 | ⬜ |
| 3.3 | Sticky session `hash $arg_roomId$arg_room` 已配置 | ⬜ |
| 3.4 | `/__health` 可访问 | ⬜ |
| 3.5 | `/__metrics` 可访问 (或受限) | ⬜ |
| 3.6 | `/admin` 可访问且受 auth 保护 | ⬜ |

## 4. Docker

| # | 检查项 | ✅ |
|---|---|---|
| 4.1 | `docker-compose -f docker/docker-compose.prod.yml up -d` 成功 | ⬜ |
| 4.2 | 所有容器 Running: `docker ps` | ⬜ |
| 4.3 | Redis: `docker exec redis redis-cli ping` → PONG | ⬜ |
| 4.4 | 2x partygame 实例: 日志无 FATAL/ERROR | ⬜ |
| 4.5 | Nginx: 日志无 502/503 | ⬜ |

## 5. Health Check

| # | 检查项 | ✅ |
|---|---|---|
| 5.1 | `curl -k https://localhost/__health` → `{"status":"ok"}` | ⬜ |
| 5.2 | `curl http://localhost:3000/__health` (direct) | ⬜ |
| 5.3 | Docker healthcheck passing: `docker ps` STATUS=healthy | ⬜ |

## 6. Metrics

| # | 检查项 | ✅ |
|---|---|---|
| 6.1 | `curl -k https://localhost/__metrics` 返回 Prometheus 格式 | ⬜ |
| 6.2 | `partygame_rooms_active` 指标存在 | ⬜ |
| 6.3 | `partygame_ws_connections_active` 指标存在 | ⬜ |
| 6.4 | Prometheus targets UP: `http://localhost:9090/targets` | ⬜ |

## 7. Grafana Dashboard

| # | 检查项 | ✅ |
|---|---|---|
| 7.1 | `http://localhost:3000` → Grafana 登录 | ⬜ |
| 7.2 | "PartyGameSDK Overview" Dashboard 可见 | ⬜ |
| 7.3 | Active Rooms / WS / Msg/sec 面板有数据 | ⬜ |
| 7.4 | Errors per 5 min / Reconnects 面板正常 | ⬜ |

## 8. Admin

| # | 检查项 | ✅ |
|---|---|---|
| 8.1 | `https://localhost/admin` → Admin 页面可加载 | ⬜ |
| 8.2 | Token 输入后 `/admin/rooms` 返回数据 | ⬜ |
| 8.3 | Metrics cards 显示正确数值 | ⬜ |
| 8.4 | Close room 功能正常 (测试房间验证) | ⬜ |

## 9. WebSocket / WSS

| # | 检查项 | ✅ |
|---|---|---|
| 9.1 | `wss://localhost` → WebSocket 握手成功 | ⬜ |
| 9.2 | Screen 能创建房间 (`create_room` → `room_created`) | ⬜ |
| 9.3 | Controller 能加入房间 (`join_room` → `room_joined`) | ⬜ |
| 9.4 | game_message 正常转发 (controller → screen) | ⬜ |
| 9.5 | broadcast 正常广播 (screen → controllers) | ⬜ |
| 9.6 | close_room 正常 (controllers 收到 `room_closed`) | ⬜ |
| 9.7 | reconnectToken 10s 内重连成功 | ⬜ |

## 10. Unity WebGL Template

| # | 检查项 | ✅ |
|---|---|---|
| 10.1 | Unity Build 产物部署到 `screen-build/` | ⬜ |
| 10.2 | `/screen` 加载 Unity WebGL 页面 | ⬜ |
| 10.3 | QR Code 生成且可扫码 | ⬜ |
| 10.4 | Controller 扫码后能正常游戏 | ⬜ |

## 11. 灰度前最终确认

| # | 检查项 | ✅ |
|---|---|---|
| 11.1 | 所有 checklist 项 PASS | ⬜ |
| 11.2 | 回滚方案已确认 (ROLLBACK.md) | ⬜ |
| 11.3 | 灰度计划已审批 (CANARY_PLAN.md) | ⬜ |
| 11.4 | 告警规则已加载 (ALERT_RULES.md) | ⬜ |
| 11.5 | 值班人员已通知 | ⬜ |
