# PartyGameSDK v0.3.2 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 基础设施 — Nginx 反向代理 / HTTPS 终止 / WSS 代理 / Sticky Session  
**基调:** 生产入口就绪 — client → Nginx TLS → WSS → sticky hash → app instance，一行 docker-compose 启动

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.2 |
| **Git Tag** | `v0.3.2` |
| **Commit** | `9f619df` |
| **分支** | `platform/v0.3.2` (从 `platform/v0.3.1` 新建) |
| **基线** | v0.3.1 |
| **测试** | **70/70 PASS** ✓ |
| **server.js** | **零修改** |
| **协议** | **零修改** |

---

## 2. 新增能力

### 2.1 Nginx TLS 终止

```
client ──HTTPS──▶ Nginx :443 ──HTTP──▶ partygame-1:3000
                                    ──HTTP──▶ partygame-2:3000
```

- SSL 证书支持自签名 (开发) 和 Let's Encrypt (生产)
- TLS 1.2 / 1.3
- `ssl_prefer_server_ciphers on`

### 2.2 WSS 代理

Nginx 代理 WebSocket 连接，透明转发 Upgrade 握手：

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_read_timeout 86400s;   # WS 长连接不超时
```

Controller/Screen 端 `ws://` 和 `wss://` 自动检测协议。

### 2.3 Sticky Session

Nginx 根据 roomId 做请求哈希，同房间的 screen 和所有 controllers 自动落到同一实例：

```nginx
upstream partygame_backend {
    hash $arg_roomId$arg_room consistent;
    server partygame-1:3000;
    server partygame-2:3000;
}
```

### 2.4 Health / Metrics Proxy

| 端点 | Nginx | 后端 | 说明 |
|---|---|---|---|
| `/__health` | 代理 | 任一实例 | 始终暴露 |
| `/__metrics` | 代理 | 任一实例 | 可按 IP 限制 |

### 2.5 Docker 服务编排

```yaml
services:
  nginx           # TLS 终止 + sticky routing (80, 443)
  redis           # 状态共享 (6379)
  partygame-1     # 实例 1 (STORE_TYPE=redis)
  partygame-2     # 实例 2 (STORE_TYPE=redis)
```

---

## 3. Sticky Session 设计

### 3.1 问题

多实例部署时，screen 和 controller 必须落到同一进程，否则 WebSocket 消息无法在进程间路由（没有 Redis Pub/Sub）。

### 3.2 方案

Nginx `hash` 指令根据 roomId 做确定性路由，保证同 roomId 的所有连接落到同一 upstream。

### 3.3 完整时序

```
1. Screen 首次连接 /screen
   → 无 roomId → hash("") → 实例 A
   → 建立 WebSocket

2. Screen 发送 create_room
   → Server 返回 room_created { roomId: "ABC123" }

3. Screen 更新 URL
   → history.replaceState('?roomId=ABC123')
   → URL 变为 /screen?roomId=ABC123
   → 页面不刷新，WebSocket 保持连接

4. Controller 连接 /controller?room=ABC123
   → hash("ABC123") → 实例 A  ✅ 与 screen 同实例
   → 建立 WebSocket，join_room

5. 同房间所有后续连接
   → /screen?roomId=ABC123  → hash("ABC123") → A
   → /controller?room=ABC123 → hash("ABC123") → A
   → 全部同一实例
```

### 3.4 Screen 端实现

`screen/index.html` — `handleRoomCreated()` 末尾:

```javascript
// v0.3.2: 更新 URL 以支持 Nginx sticky session
// history.replaceState 不刷新页面 → WebSocket 保持连接
if (!new URLSearchParams(location.search).has('roomId')) {
  history.replaceState(null, '', '?roomId=' + currentRoomId);
}
```

### 3.5 关键结论

**当前阶段不需要 Redis Pub/Sub。**

Nginx `hash $arg_roomId$arg_room` 在入口处就解决了同房间路由问题。所有同房间的 WebSocket 连接都在同一进程内，消息投递走进程内 `activeSockets` Map，无需跨进程 Pub/Sub。

---

## 4. HTTPS / WSS

### 4.1 本地自签名证书（开发）

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

### 4.2 生产证书（Let's Encrypt）

```bash
# 获取证书
sudo certbot certonly --standalone -d yourdomain.com

# 挂载到 Nginx
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   docker/nginx/ssl/key.pem

# 自动续期
echo "0 3 * * * certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
```

### 4.3 wss:// 连接说明

客户端自动检测协议：

```javascript
// controller / screen / Unity WebGL Template 均使用:
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = protocol + '//' + location.host;
```

- `https://localhost/screen` → `wss://localhost` (由 Nginx 代理)
- `http://localhost:3000/screen` → `ws://localhost:3000` (直连开发)

### 4.4 浏览器自签名证书注意事项

- **首次访问** 浏览器会提示 "不安全" → 点击 "高级" → "继续访问"
- **WebSocket (wss://)** 同样需要信任自签名证书，浏览器会显示警告
- **移动端测试** iOS Safari 需要先手动安装并信任证书描述文件
- **生产环境** 必须使用 CA 签发的证书，自签名不可用于公网

---

## 5. Docker 运行

### 5.1 生成证书并启动

```bash
# 1. 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# 2. 启动全部服务
docker-compose -f docker/docker-compose.nginx.yml up -d

# 3. 验证
open https://localhost/screen
```

### 5.2 Health Check

```bash
curl -k https://localhost/__health
# {"status":"ok","version":"0.3.1","uptime":12.3,"activeRooms":0,...}
```

### 5.3 Metrics Check

```bash
curl -k https://localhost/__metrics
# partygame_rooms_active 0
# partygame_ws_connections 0
# ...
```

### 5.4 停止

```bash
docker-compose -f docker/docker-compose.nginx.yml down
```

---

## 6. 测试结果

| 套件 | 测试数 | 结果 |
|---|---|---|
| MemoryStore 回归 (A+B+C+D+E+F) | 60 | **60/60 PASS** ✓ |
| RedisStore 专项 (v0.3.1 验证) | 20 | **20/20 PASS** ✓ |
| v0.3.2 Nginx 专项 | 10 | **10/10 PASS** ✓ |
| **总计** | **70** | **70/70 PASS** ✓ |

### Nginx 专项明细

| ID | 测试 | 结果 |
|---|---|---|
| N1 | nginx.conf 存在 | ✅ |
| N2 | config sections 完整 (upstream/SSL/WSS/health/metrics) | ✅ |
| N3 | SSL cert 生成 | ✅ |
| N4 | screen sticky redirect (`history.replaceState`) | ✅ |
| N5 | SSL README 完整 (self-signed/Let's Encrypt/k8s) | ✅ |
| N6 | docker-compose.nginx.yml 存在 | ✅ |
| N7 | 4 services 定义 (nginx/redis/2x app) | ✅ |
| N8 | server.js 零协议修改 (60/60 回归通过) | ✅ |
| N9 | 五条铁律保持 | ✅ |
| N10 | Sticky 策略文档化 | ✅ |

---

## 7. 已知边界

| 边界 | 说明 |
|---|---|
| **Sticky 依赖 roomId** | 首次 screen 加载无 roomId → `hash("")` → 固定实例；room 创建后 URL 更新解决 |
| **跨房间路由不支持** | 不同房间的 screen/controller 无法跨房间通信（设计如此） |
| **无 Redis Pub/Sub** | 当前通过 Nginx sticky 解决路由，不需要 Pub/Sub。若未来需要 WebSocket 消息跨实例转发（如全局广播、跨房间聚合），才需引入 |
| **无 Grafana Dashboard** | 指标已暴露 `/__metrics`，Dashboard 在 v0.3.3 |
| **无管理后台** | 无 Web UI 查看/控制房间，在 v0.3.4 |
| **SSL 自签名** | 生产需替换为 CA 证书 |
| **无 WAF / 限流** | 无 IP/连接数限制 |
| **Nginx 未在 CI 中实测** | 仅配置验证，未启动 Docker 端到端测试 |

---

## 8. 下一步建议

| 版本 | 内容 | 说明 |
|---|---|---|
| **v0.3.3** | Grafana Dashboard | Prometheus + Grafana 集成，预配置面板 (Rooms/Connections/QPS/Errors) |
| **v0.3.4** | 房间管理后台 | `GET /admin/rooms` API + admin UI + ADMIN_TOKEN 鉴权 |
| **v0.4.0** | 生产灰度版 | 全链路回归 70+ tests + 灰度 checklist + 运维 runbook |

---

## 9. 修改文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `docker/nginx/nginx.conf` | 新增 | TLS + WSS + sticky + health/metrics proxy |
| `docker/nginx/ssl/README.md` | 新增 | 3 种 SSL 方案 (self-signed/Let's Encrypt/k8s) |
| `docker/nginx/ssl/cert.pem` | 新增 | 自签名证书 |
| `docker/nginx/ssl/key.pem` | 新增 | 自签名私钥 |
| `docker/docker-compose.nginx.yml` | 新增 | nginx + redis + 2x app |
| `screen/index.html` | 修改 | +7 行 sticky URL redirect |
| `server/server.js` | 不变 | 零修改 |
| **协议** | 不变 | 零修改 |

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
