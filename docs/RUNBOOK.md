# PartyGameSDK v0.4.0 — Runbook

> 日常运维操作手册。v0.4.0 生产灰度版。

---

## 1. 服务管理

### 启动全部服务

```bash
docker-compose -f docker/docker-compose.prod.yml up -d
```

### 停止全部服务

```bash
docker-compose -f docker/docker-compose.prod.yml down
```

### 重启单个服务

```bash
docker-compose -f docker/docker-compose.prod.yml restart partygame-1
```

### 查看服务状态

```bash
docker-compose -f docker/docker-compose.prod.yml ps
```

---

## 2. 日志

### 查看 app 日志

```bash
docker-compose -f docker/docker-compose.prod.yml logs -f partygame-1 partygame-2
```

### 查看 Nginx 日志

```bash
docker-compose -f docker/docker-compose.prod.yml logs -f nginx
```

### 查看 Redis 日志

```bash
docker-compose -f docker/docker-compose.prod.yml logs -f redis
```

### 日志格式化 (JSON → readable)

```bash
docker-compose logs partygame-1 | tail -20 | while read l; do echo "$l" | python3 -m json.tool 2>/dev/null || echo "$l"; done
```

---

## 3. Metrics

### Prometheus 查询

```
http://localhost:9090/graph
```

常用查询:
```
partygame_rooms_active
partygame_ws_connections_active
rate(partygame_messages_received_total[5m])
partygame_errors_total
partygame_reconnect_successes_total / partygame_reconnect_attempts_total
```

### 直接抓取

```bash
curl -k https://localhost/__metrics
```

---

## 4. Grafana

```
http://localhost:3000  (admin/admin)
→ Dashboards → PartyGameSDK Overview
```

---

## 5. Admin

```
https://localhost/admin
```

输入 Admin Token → 查看房间列表 → 点击 Detail 查看详情 → 必要时 Close Room。

---

## 6. 故障处理

### 6.1 Redis 不可用

**症状:** Prometheus 显示 `redis_up=0`，app 日志报 `ECONNREFUSED`。

**排查:**
```bash
docker exec redis redis-cli ping          # 应返回 PONG
docker-compose restart redis              # 重启
```

**Redis 数据恢复:** 当前无持久化。重启后所有房间状态丢失——这是预期行为。

### 6.2 Nginx 502/503

**症状:** HTTPS 访问返回 502。

**排查:**
```bash
docker-compose ps                          # 确认 partygame 实例 Running
curl http://localhost:3000/__health       # 直连 app 验证
docker-compose restart nginx              # 重启 nginx
```

### 6.3 WebSocket 无法连接

**症状:** 浏览器 Console 显示 `WebSocket connection failed`。

**排查:**
1. 确认 Nginx `proxy_set_header Upgrade` 已配置
2. 确认 `proxy_read_timeout 86400s` (非默认 60s)
3. 检查反向代理是否支持 WebSocket (Cloudflare 需要开启)
4. `curl -k -H "Upgrade: websocket" -H "Connection: Upgrade" https://localhost/`

### 6.4 房间无法创建

**症状:** Screen 端显示 "连接中" 不变化。

**排查:**
1. `curl https://localhost/__health` → 确认 server 健康
2. Admin 页面查看 activeRooms 数量
3. 检查 `REDIS_URL` 是否正确连接
4. 查看 server 日志: `docker-compose logs partygame-1 | grep room`

### 6.5 Controller 无法加入

**症状:** Controller 页面显示 "Room not found"。

**排查:**
1. 确认 URL 参数正确: `?room=ROOM_ID`
2. 确认 roomId 大小写匹配 (6 位大写 hex)
3. Admin 页面确认 room 存在且未满员
4. 检查 sticky session: controller 和 screen 应在同一实例

### 6.6 room_full 异常

**症状:** 玩家 < maxPlayers 时提示 Room Full。

**排查:**
1. Admin 查看实际 playerCount
2. 可能有幽灵玩家未清理 → `POST /admin/rooms/:id/close`

### 6.7 Reconnect 失败

**症状:** Controller 刷新后显示 "Reconnect failed"。

**原因:** 超过 10s token TTL。

**处理:** 用户需重新扫码加入——这是预期行为。

### 6.8 room_closed 未收到

**症状:** Admin close room 后 controller 未收到通知。

**排查:**
1. 确认 close 返回 `{"ok":true}`
2. 确认 controller WebSocket 仍连接
3. 检查是否有 `players.changed` 在 `room_closed` 之前到达

---

## 7. 管理操作

### 查看所有房间

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://localhost/admin/rooms | python3 -m json.tool
```

### 关闭房间

```bash
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://localhost/admin/rooms/ABC123/close
```

### 查看房间详情

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://localhost/admin/rooms/ABC123 | python3 -m json.tool
```

### 清空所有房间 (Redis)

```bash
docker exec redis redis-cli FLUSHDB
# ⚠️ 所有房间和玩家状态丢失
```
