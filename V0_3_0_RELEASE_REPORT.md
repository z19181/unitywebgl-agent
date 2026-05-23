# PartyGameSDK v0.3.0 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 生产部署与可观测性  
**基调:** 结构化日志 + Prometheus 指标 + Docker 部署 + CI 回归

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.0 |
| **Git Tag** | `v0.3.0` |
| **Commit** | `2e63d06` |
| **分支** | `platform/v0.3.0` |
| **基线** | v0.2.x LTS Candidate |
| **测试** | 60/60 PASS ✓ |

---

## 2. 新增能力

### 2.1 结构化日志

`server/logger/index.js`

```bash
# Pretty (default)
node server/server.js
# 14:32:01 INFO  connected wsId=a1b2c3d4
# 14:32:02 INFO  room_created roomId=FA3B21

# JSON (for log aggregators)
LOG_FORMAT=json node server/server.js
# {"ts":"2026-05-23T14:32:01Z","service":"partygame","level":"info","msg":"connected","wsId":"a1b2..."}
```

| 环境变量 | 默认 | 说明 |
|---|---|---|
| `LOG_LEVEL` | `info` | debug/info/warn/error |
| `LOG_FORMAT` | `pretty` | pretty/json |
| `LOG_PREFIX` | `partygame` | 服务标识 |

### 2.2 Prometheus 指标

`GET /__metrics`

```
partygame_rooms_active 3
partygame_rooms_created_total 12
partygame_ws_connections 8
partygame_messages_received_total 245
partygame_messages_rate_per_minute 42
partygame_reconnect_attempts_total 3
partygame_reconnect_successes_total 2
```

`GET /__health`

```json
{"status":"ok","version":"0.3.0","uptime":123.4,"activeRooms":3,"totalMessages":245,...}
```

### 2.3 错误码体系

`server/errors.js`

| 层级 | 范围 | 示例 |
|---|---|---|
| 连接层 | 1xxx | `1001` Invalid JSON, `1003` Disconnected |
| 房间层 | 2xxx | `2001` Room not found, `2002` Room full |
| 角色层 | 3xxx | `3001` Not controller, `3002` Not screen |
| 重连层 | 4xxx | `4002` Invalid token, `4003` Timeout |
| 输入层 | 5xxx | `5001` Fake playerIndex detected |

### 2.4 Docker 部署

```bash
cd docker/
docker-compose up -d
# → http://localhost:3000
```

### 2.5 压测脚本

```bash
node scripts/loadtest/loadtest.js --rooms=10 --players=4 --duration=30
```

### 2.6 CI 回归测试

```bash
./scripts/ci-test.sh
# → Health check → 11 regression tests → Metrics check → ✅ PASS
```

---

## 3. 向后兼容

| 检查项 | 状态 |
|---|---|
| 协议消息格式 | ✅ 不变 (room_not_found/room_full/reconnect_failed 保持原样) |
| client 端代码 | ✅ 零修改 |
| 60 项回归 | ✅ 60/60 PASS |
| 五条铁律 | ✅ 全部满足 |

---

## 4. 修改文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `server/logger/index.js` | 新增 | 结构化日志 |
| `server/metrics/index.js` | 新增 | Prometheus 指标 |
| `server/errors.js` | 新增 | 错误码体系 |
| `server/server.js` | 修改 | 集成日志+指标+错误码 |
| `docker/Dockerfile` | 新增 | 生产镜像 |
| `docker/docker-compose.yml` | 新增 | 一键启动 |
| `scripts/loadtest/loadtest.js` | 新增 | WebSocket 压测 |
| `scripts/ci-test.sh` | 新增 | CI 回归 |

---

## 5. 测试结果

**60/60 PASS** — 完整向后兼容 ✓

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
