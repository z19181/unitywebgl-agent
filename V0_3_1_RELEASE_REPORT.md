# PartyGameSDK v0.3.1 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 架构升级 — Store 抽象层 + Redis 多实例状态共享  
**基调:** 从单进程内存到可扩展架构 — 状态外置，接口统一，零协议变更

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.1 |
| **Git Tag** | `v0.3.1` |
| **Commit** | `a09709d` |
| **分支** | `platform/v0.3.1` (从 `platform/v0.3.0` 新建) |
| **基线** | v0.3.0 |
| **MemoryStore 测试** | **60/60 PASS** ✓ |
| **RedisStore 测试** | **20/20 PASS** ✓ |

---

## 2. 新增能力

### 2.1 Store 抽象接口

**文件:** `server/store/Store.js`

| 方法组 | 方法 | 说明 |
|---|---|---|
| Room | `createRoom`, `getRoom`, `updateRoom`, `deleteRoom`, `roomExists`, `getAllRoomIds`, `getRoomCount` | 房间生命周期 |
| Player | `addPlayer`, `removePlayer`, `getPlayers`, `getPlayerCount` | 玩家管理 |
| Socket | `setPlayerSocket`, `getPlayerBySocket`, `deletePlayerSocket` | WS ↔ Player 映射 |
| PlayerIndex | `allocatePlayerIndex(roomId, maxPlayers)` | 原子分配，满员返回 null |
| Reconnect | `setReconnectToken`, `getReconnectToken`, `deleteReconnectToken` | Token + TTL |
| Session | `setSocketSession`, `getSocketSession`, `deleteSocketSession` | 跨进程 session |
| Lifecycle | `init`, `close` | 启动/关闭 |

**共 22 方法。** 所有 v0.3.0 的 Map 操作已迁移到 Store 调用。

### 2.2 MemoryStore（默认）

**文件:** `server/store/MemoryStore.js`

- 基于 `Map` 的内存实现
- `allocatePlayerIndex` → 内存计数器自增
- `setReconnectToken` → `setTimeout` (10s TTL)
- `deleteRoom` → `clearTimeout` 清理所有 reconnect timers
- **零外部依赖**，开发模式默认使用

### 2.3 RedisStore

**文件:** `server/store/RedisStore.js`

- 基于 `ioredis` 的 Redis 实现
- `allocatePlayerIndex` → `HINCRBY` (原子，多实例安全)
- `setReconnectToken` → `SETEX key 10` (Redis TTL，跨进程共享)
- `deleteRoom` → `DEL room + players + reconnect + token keys`
- `getRoomCount` → `KEYS pg:room:*` 过滤统计
- Socket session → `HSET pg:socket:{wsId}` + `EXPIRE 3600`

**启用方式:**

```bash
STORE_TYPE=redis REDIS_URL=redis://localhost:6379 node server/server.js
```

### 2.4 Store 工厂

**文件:** `server/store/index.js`

```javascript
const { createStore } = require('./store');
const store = await createStore();
// → MemoryStore (STORE_TYPE=memory, default)
// → RedisStore (STORE_TYPE=redis, REDIS_URL=redis://...)
```

### 2.5 Docker 多实例部署

**文件:** `docker/docker-compose.redis.yml`

```yaml
services:
  redis:          # Redis 7 Alpine
  partygame-1:    # :3001 → STORE_TYPE=redis
  partygame-2:    # :3002 → STORE_TYPE=redis
```

---

## 3. Redis Key 设计

| Key | 类型 | 内容 | TTL |
|---|---|---|---|
| `pg:room:{roomId}` | Hash | `roomId`, `screenSocketId`, `maxPlayers`, `nextPlayerIndex`, `reconnectSecret`, `createdAt` | 无 (房间关闭时 DEL) |
| `pg:room:{roomId}:players` | Hash | `{playerIndex}` → `{"playerName":"P0","socketId":"ws-abc"}` | 无 (随房间) |
| `pg:room:{roomId}:reconnect` | Hash | `{token}` → `{"playerIndex":0,"playerName":"P0","socketId":"ws-abc"}` | 无 (随房间) |
| `pg:socket:{wsId}` | Hash | `roomId`, `playerIndex`, `session` | 3600s |
| `pg:reconnect:{token}` | String | `{"roomId":"ABC","playerIndex":0,"playerName":"P0"}` | SETEX 10s |

### 清理策略

| 事件 | 清理操作 |
|---|---|
| `close_room` | `DEL pg:room:{id}` + `pg:room:{id}:players` + `pg:room:{id}:reconnect` + 关联的 `pg:reconnect:*` |
| reconnect 成功 | `HDEL pg:room:{id}:reconnect {token}` + `DEL pg:reconnect:{token}` |
| reconnect TTL 过期 | Redis 自动删除 `pg:reconnect:{token}` |
| 进程退出 | `pg:socket:*` 自然 TTL 过期 |

---

## 4. Store 行为一致性验证

| 场景 | MemoryStore (60/60) | RedisStore (20/20) | 一致 |
|---|---|---|---|
| create_room → getRoom | ✅ Map.set/get | ✅ HSET/HGETALL | ✅ |
| join_room → addPlayer | ✅ Array push | ✅ HSET pg:room:*:players | ✅ |
| maxPlayers=4 → room_full | ✅ length check | ✅ HLEN check | ✅ |
| playerIndex 分配 | ✅ 内存 ++ | ✅ HINCRBY (原子) | ✅ |
| fake playerIndex=999 | ✅ 从 store 查 socket | ✅ 从 store 查 socket | ✅ |
| broadcast | ✅ 遍历 activeSockets | ✅ 遍历 activeSockets | ✅ |
| close_room | ✅ Map.delete + clearTimeout | ✅ DEL keys | ✅ |
| reconnectToken 10s TTL | ✅ setTimeout | ✅ SETEX | ✅ |
| deleteRoom cleanup | ✅ 清理 Map + timers | ✅ DEL 多个 key | ✅ |

**接口一致性:** 22/22 methods identical ✅

---

## 5. server.js 重构要点

| 改造项 | 旧 (v0.3.0) | 新 (v0.3.1) |
|---|---|---|
| 房间存储 | `const rooms = new Map()` | `await store.createRoom/getRoom/deleteRoom` |
| 玩家存储 | `room.controllers.set(ws, info)` | `await store.addPlayer/getPlayers` |
| playerIndex | `room.nextPlayerIndex++` | `await store.allocatePlayerIndex(roomId, max)` |
| reconnectToken | `room.disconnectedControllers.set(token, info)` | `await store.setReconnectToken/getReconnectToken` |
| socket 映射 | `ws.data` (进程内) | `await store.setPlayerSocket/getPlayerBySocket` |
| WS 广播 | 遍历 `room.controllers` | 遍历本地 `activeSockets` (同进程) |

**协议消息不变。** 所有 `event` / `type` / 数据格式与 v0.1.0 完全一致。

---

## 6. 多实例能力边界

### ✅ 已实现

| 能力 | 验证 | 方式 |
|---|---|---|
| **状态共享** | R19 ✅ | 两个 RedisStore 实例共享 pg:room:* keys |
| **playerIndex 原子分配** | R6 ✅ R20 ✅ | HINCRBY，两个实例分别分配 P0/P1 |
| **reconnectToken TTL** | R10 ✅ | SETEX，两个实例均可校验 token |

### ❌ 未实现

| 能力 | 原因 | 影响 |
|---|---|---|
| **跨实例消息路由** | `activeSockets` 是进程内 Map | screen 在 A，controller 在 B → 消息无法送达 |
| **sendToScreen 跨实例** | `sendToSocketById` 只能找本地 WS | game_message 转发失败 |
| **broadcastToControllers 跨实例** | 只能广播到本地 controllers | 跨实例玩家收不到广播 |
| **完全多实例独立部署** | WebSocket 绑进程 | 需 sticky session 或 Pub/Sub |

### 当前多实例部署约束

```
screen ──WS──▶ 实例 A  ← 所有 controllers 必须连 A
controller ──▶ 实例 A

screen ──WS──▶ 实例 A  ← screen 在 A
controller ──▶ 实例 B  ← ❌ controller 在 B → game_message 发送到 B
                           → B.sendToScreen 找不到 A 上的 screen
                           → 消息丢失
```

---

## 7. v0.3.2 建议

### 方案 A: Nginx Sticky Session（推荐）

```
                    ┌──────────┐
                    │  Nginx   │  ← TLS 终止 + sticky
                    │  :443    │
                    └────┬─────┘
                         │ hash on roomId or cookie
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         instance-1  instance-2  instance-3
         :3001       :3002       :3003
              │          │          │
              └──────────┼──────────┘
                         │
                      ┌──┴──┐
                      │Redis│  ← 状态共享
                      └─────┘
```

**Nginx 配置:**

```nginx
upstream partygame {
    hash $arg_room;  # 按 roomId 粘性
    server instance-1:3000;
    server instance-2:3000;
    server instance-3:3000;
}

server {
    listen 443 ssl;
    location / {
        proxy_pass http://partygame;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;    # WSS
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;                  # WS 长连接
    }
}
```

**优势:**
- 不需要修改 server.js
- 不需要 Redis Pub/Sub
- 同房间所有连接自动落到同一实例
- 自然支持 WSS (TLS 终止)

### 方案 B: Redis Pub/Sub（备选）

仅在 sticky 无法满足时使用（如 serverless 环境）。每个实例 `subscribe` 房间频道，收到消息后转发给本地 WS。

**v0.3.2 推荐: Nginx reverse proxy + sticky session + HTTPS/WSS**

---

## 8. 修改文件清单

| 文件 | 类型 | ±行 | 说明 |
|---|---|---|---|
| `server/store/Store.js` | 新增 | +80 | Store 抽象接口 (22 methods) |
| `server/store/MemoryStore.js` | 新增 | +120 | 内存实现 (默认) |
| `server/store/RedisStore.js` | 新增 | +200 | Redis 实现 (ioredis) |
| `server/store/index.js` | 新增 | +35 | Store 工厂 |
| `server/server.js` | 修改 | +150/−80 | 从 Map → Store 迁移 |
| `docker/docker-compose.redis.yml` | 新增 | +55 | 多实例 + Redis |
| `package.json` | 修改 | +1 | ioredis 依赖 |
| `package-lock.json` | 新增 | — | 依赖锁 |

**总计:** 8 文件变更 (6 新增 + 2 修改)

---

## 9. 测试总结

| 测试套件 | 结果 |
|---|---|
| MemoryStore 60 项回归 (A+B+C+D+E+F) | **60/60 PASS** ✅ |
| RedisStore 专项 (R1-R20) | **20/20 PASS** ✅ |
| Store 接口一致性 (22 methods) | **22/22 MATCH** ✅ |
| 多实例状态共享 | **PASS** ✅ |
| 多实例消息路由 | **NOT IMPLEMENTED** ❌ |

---

**发布校验清单:**
- [x] MemoryStore 60/60 PASS
- [x] RedisStore 20/20 PASS
- [x] Store 接口 22 methods 一致
- [x] 协议消息格式零修改
- [x] 五条铁律全部满足
- [x] 默认 STORE_TYPE=memory 无外部依赖
- [x] RedisStore HINCRBY 原子分配验证
- [x] RedisStore SETEX TTL 验证
- [x] Redis key 清理验证
- [x] 多实例状态共享验证
- [x] 多实例消息路由边界明确
- [x] Git tag `v0.3.1` 已打
- [x] v0.3.2 建议: Nginx sticky + HTTPS/WSS

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
