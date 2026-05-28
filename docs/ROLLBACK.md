# PartyGameSDK v0.4.0 — Rollback Plan

> 从 v0.4.0 灰度回退到 v0.3.4 (stable)。

---

## 触发条件

出现以下任一情况应立即回滚:
- 5xx 错误率 > 1% 持续 5 分钟
- WebSocket 断开率 > 10%
- 房间创建成功率 < 90%
- reconnect 成功率 < 50%
- 人工判定不可接受

---

## 回滚步骤

### Step 1: 停止 v0.4.0

```bash
docker-compose -f docker/docker-compose.prod.yml down
```

### Step 2: 切换到 v0.3.4

```bash
git checkout platform/v0.3.4
# 或
git checkout tags/v0.3.4
```

### Step 3: 确认 Redis 数据

```bash
# 如果 room 状态需要保留 (灰度期间):
docker exec redis redis-cli DBSIZE    # 查看 key 数量
# 如果 room 状态需要清空 (灰度中断):
docker exec redis redis-cli FLUSHDB
```

**推荐:** 灰度期间 Redis 数据可保留。v0.3.4 能正常读取相同的 Store key 格式。

### Step 4: 启动 v0.3.4

```bash
docker-compose -f docker/docker-compose.monitoring.yml up -d
# 或使用 v0.3.4 对应的 compose 文件
```

### Step 5: 回滚后验证

```bash
curl https://localhost/__health         # → {"status":"ok","version":"0.3.4"}
curl https://localhost/admin/health     # → {"ok":true}
```

### Step 6: 通知

- 通知团队: v0.4.0 已回退到 v0.3.4
- 记录原因: 在 incident log 中记录触发条件
- 修复后重新灰度

---

## 回滚前检查

| # | 检查项 | ✅ |
|---|---|---|
| 1 | 确认 v0.3.4 代码已拉取 (`git tag -l v0.3.4`) | ⬜ |
| 2 | 确认 Docker image 可构建 (`docker-compose build`) | ⬜ |
| 3 | 确认 Redis key 格式兼容 (v0.3.x → v0.3.x 始终兼容) | ⬜ |
| 4 | 确认健康检查通过 (`curl /__health`) | ⬜ |

---

## Docker Image Rollback

如果使用固定 tag 部署:

```bash
# 回退 Docker image
docker-compose -f docker/docker-compose.prod.yml down
docker tag partygame:v0.3.4 partygame:latest
docker-compose -f docker/docker-compose.prod.yml up -d
```

---

## Redis 数据策略

| 场景 | 操作 |
|---|---|
| 灰度中断 (暂不恢复) | `FLUSHDB` 清空 |
| 灰度中断 (短期恢复) | 保留数据 |
| 灰度成功 (切全量) | 保留数据 |
| 季度清理 | `FLUSHDB` |

---

## 联系

| 角色 | 操作 |
|---|---|
| Dev 值班 | 执行回滚 + 验证 |
| Ops | 确认 Nginx/TLS 配置未变 |
| PM | 通知回滚决策 |
