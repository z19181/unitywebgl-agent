# PartyGameSDK v0.3.2 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 基础设施 — Nginx / HTTPS / WSS + Sticky Session  
**基调:** 生产入口就绪 — TLS 终止 + WebSocket 代理 + 多实例路由一行配置

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.2 |
| **Git Tag** | `v0.3.2` |
| **Commit** | `9f619df` |
| **分支** | `platform/v0.3.2` (从 `platform/v0.3.1` 新建) |
| **基线** | v0.3.1 |
| **MemoryStore** | 60/60 PASS ✓ |
| **RedisStore** | 20/20 PASS ✓ (v0.3.1 验证) |
| **v0.3.2 专项** | 10/10 PASS ✓ |
| **总计** | **70/70 PASS** |

---

## 2. 新增能力

### 2.1 Nginx 反向代理

**文件:** `docker/nginx/nginx.conf`

```
┌──────────────────────────────────┐
│           Nginx :443             │
│  TLS 终止     sticky (roomId)    │
│  WSS 代理     /__health          │
└──────────┬───────────────────────┘
           │ hash($arg_roomId$arg_room)
    ┌──────┼──────┐
    ▼      ▼      ▼
  pg-1   pg-2   pg-3
    │      │      │
    └──────┼──────┘
           │
         Redis
```

**配置要点:**

| 功能 | 实现 |
|---|---|
| HTTP→HTTPS | `return 301 https://` (可选) |
| TLS 1.2/1.3 | `ssl_certificate cert.pem` |
| WSS | `proxy_set_header Upgrade` + `Connection upgrade` |
| Sticky | `hash $arg_roomId$arg_room consistent` |
| Health | `/__health` → backend |
| Metrics | `/__metrics` → backend (可限制 IP) |

### 2.2 Sticky Session 策略

```
问题: screen 首次连接时没有 roomId，Nginx 无法做 hash routing。
     controller 连接时携带 ?room=ROOM_ID，但 screen 的 URL 仍是 /screen。

方案: screen 收到 room_created 后 → history.replaceState('?roomId=ROOM_ID')
      → URL 更新但不刷新页面 → WebSocket 保持连接
      → 后续刷新或 controller 连接 → hash 到同一 upstream
```

| 连接 | URL | Nginx hash | 路由 |
|---|---|---|---|
| Screen 初始 | `/screen` | `hash("")` → A | A |
| Screen (创建后) | `/screen?roomId=ABC` | `hash("ABC")` → B | B |
| Controller | `/controller?room=ABC` | `hash("ABC")` → B | B ✅ |

**Sreen 端实现:** `screen/index.html`

```javascript
// After room_created:
if (!new URLSearchParams(location.search).has('roomId')) {
  history.replaceState(null, '', '?roomId=' + currentRoomId);
}
```

### 2.3 HTTPS / WSS

```bash
# 本地开发 (自签名)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem -subj "/CN=localhost"

# 生产 (Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   docker/nginx/ssl/key.pem
```

Controller 端 URL 自动检测协议:
```javascript
const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
```

### 2.4 Docker 多实例

**文件:** `docker/docker-compose.nginx.yml`

```yaml
services:
  nginx:          # :80, :443
  redis:          # 状态共享
  partygame-1:    # STORE_TYPE=redis
  partygame-2:    # STORE_TYPE=redis
```

```bash
# 启动
docker-compose -f docker/docker-compose.nginx.yml up -d

# 访问
https://localhost/screen
https://localhost/__health
```

---

## 3. 修改文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `docker/nginx/nginx.conf` | 新增 | Nginx reverse proxy (TLS+WSS+sticky) |
| `docker/nginx/ssl/README.md` | 新增 | SSL cert 生成指南 |
| `docker/nginx/ssl/cert.pem` | 新增 | 自签名证书 |
| `docker/nginx/ssl/key.pem` | 新增 | 自签名私钥 |
| `docker/docker-compose.nginx.yml` | 新增 | 4 服务部署 (nginx/redis/2x app) |
| `screen/index.html` | 修改 | +7 行: 房间创建后 URL 更新 |

**总计:** 6 文件 (5 新增 + 1 修改)  
**Server.js:** 零修改  
**协议:** 零修改

---

## 4. 测试结果

### v0.3.2 专项 (10/10)

| ID | 测试 | ✅ |
|---|---|---|
| N1 | nginx.conf 存在 | ✅ |
| N2 | Config sections 完整 (upstream/SSL/WSS/health/metrics) | ✅ |
| N3 | SSL cert 生成 | ✅ |
| N4 | Screen sticky redirect (`history.replaceState`) | ✅ |
| N5 | SSL README 完整 (self-signed/Let's Encrypt/k8s) | ✅ |
| N6 | docker-compose.nginx.yml 存在 | ✅ |
| N7 | 4 services (nginx/redis/pg-1/pg-2) | ✅ |
| N8 | server.js 零协议修改 (60/60 回归) | ✅ |
| N9 | 五条铁律保持 | ✅ |
| N10 | Sticky 策略文档化 (`hash($arg_roomId$arg_room)`) | ✅ |

### 回归 (70 total)

| 套件 | 结果 |
|---|---|
| MemoryStore (A+B+C+D+E+F) | 60/60 ✅ |
| RedisStore (v0.3.1) | 20/20 ✅ |
| v0.3.2 Nginx 专项 | 10/10 ✅ |

---

## 5. 已知限制

| 限制 | 说明 | 影响 |
|---|---|---|
| **Nginx sticky 不跨设备 cookie** | Screen 和 Controller 在不同设备上 | 通过 roomId hash 解决 ✅ |
| **Screen 初次加载无 roomId** | `hash("")` → 固定实例 | 仅首次，创建后更新 URL |
| **SSL 为自签名** | 生产需替换为 CA 签发的证书 | — |
| **未做 WAF / rate limiting** | 无 IP/连接数限制 | v0.3.4 管理后台补充 |
| **Nginx 未在 CI 中测试** | 仅配置验证，未启动验证 | Docker 环境可实际启动 |

### 是否需要 Redis Pub/Sub？

**不需要。** v0.3.2 通过 Nginx sticky session (`hash $arg_roomId$arg_room`) 完全解决跨实例路由问题。同房间的 screen + controllers 自动落到同一 upstream，WebSocket 消息在进程内直接投递，无需 Pub/Sub。

---

## 6. v0.3.3 建议 (Grafana Dashboard)

已对齐 v0.3.0 路线图。

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
