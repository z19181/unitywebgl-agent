# HTTPS/WSS Supplemental QA Plan — PartyGameSDK v0.4.2

> **文档目的:** 定义 LAN HTTP 功能测试通过后，进入 Phase 2 所需的 HTTPS/WSS 专项补测计划
> **依赖:** LAN HTTP QA 结果 (21/27 PASS, 0 FAIL, 6 PENDING)
> **前置条件:** 本文档中 6 项 PENDING 全部 PASS 后方可批准 Phase 1 → Phase 2

---

## 1. 当前 LAN HTTP 结果

| 指标 | 值 |
|---|---|
| LAN HTTP PASS | 21/27 ✅ |
| FAIL | 0 |
| PENDING (HTTPS required) | 6 |
| Phase 1 → Phase 2 Gate | ❌ BLOCKED |
| `PHASE_1_MANUAL_QA_APPROVED` | `false` |
| `current_phase` | `phase_1_internal_qa` |
| `status` | `manual_device_validation_required` |

---

## 2. 需要补测的 6 项

| # | 测试项 ID | 测试项 | 优先级 | 当前状态 | 补测环境 |
|---|---|---|---|---|---|
| 1 | I2 | iOS Safari WSS 连接 | 🔴 HIGH | PENDING | HTTPS + iOS Safari 真机 |
| 2 | W2 | iOS 微信 WebView WSS 连接 | 🔴 HIGH | PENDING | HTTPS + iOS 微信 WebView |
| 3 | A2 | Android Chrome WSS 连接 | 🔴 HIGH | PENDING | HTTPS + Android Chrome |
| 4 | X2 | Android 微信 WebView WSS 连接 | 🔴 HIGH | PENDING | HTTPS + Android 微信 |
| 5 | I6 | AudioContext first touch (HTTPS) | 🟡 MEDIUM | PENDING | HTTPS + iOS Safari |
| 6 | O5+ | Grafana Dashboard / TLS 证书兼容性 | 🔴 HIGH | PENDING | 完整 docker-compose 部署 |

### 补测检查点

每项 WSS 测试需验证：
- WebSocket 成功建立 (`wss://domain`)
- 无 Mixed Content 警告
- 无证书错误
- input 发送正常
- broadcast 接收正常
- reconnect 正常（WSS 断开重建）

AudioContext 测试需验证：
- 首次触摸后 AudioContext 从 suspended → running
- 无浏览器控制台警告
- 游戏音效可正常触发

Grafana/TLS 测试需验证：
- `https://domain:3000` (Grafana) 可访问
- TLS 证书所有浏览器信任（非自签名）
- 12 个面板正常渲染
- Prometheus 数据源连接正常

---

## 3. 推荐测试环境

### 优先方案：云服务器 + 域名 + Nginx + Let's Encrypt

```
优势: 最接近生产环境，证书自动续期，WSS 原生支持
```

- 一台云服务器（AWS EC2 / 阿里云 ECS / 腾讯云 CVM）
- 已备案域名或可用的子域名
- Docker + docker-compose 环境
- Let's Encrypt 自动签发 TLS 证书

### 备选方案：Cloudflare Tunnel with fixed domain

```
优势: 无需云服务器，固定域名，支持 WSS
劣势: 依赖 Cloudflare 服务
```

- Cloudflare 账号
- 自定义域名（DNS 托管在 Cloudflare）
- `cloudflared tunnel` 命令行工具

### 不推荐：localtunnel

```
原因: 免费版 502 不稳定，URL 随机变化，不支持固定域名，无法满足 WSS 长连接测试需求
```

---

## 4. 生产近似部署步骤

### 4.1 前置条件

- [ ] 云服务器（2 vCPU / 4GB RAM 推荐）
- [ ] Docker ≥ 24.x + docker-compose ≥ 2.x
- [ ] 域名 DNS 指向服务器 IP
- [ ] 端口 80/443/3000 防火墙开放

### 4.2 部署配置

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env:
#   DOMAIN=your-domain.com
#   ADMIN_TOKEN=<生成强随机token>
#   APP_VERSION=v0.4.2

# 2. 启动生产栈（含 Nginx + Let's Encrypt）
docker-compose -f docker/docker-compose.prod.yml up -d

# 或使用 Nginx 专用配置：
docker-compose -f docker/docker-compose.nginx.yml up -d
```

### 4.3 验证清单

| # | 检查项 | 命令/操作 | 预期结果 |
|---|---|---|---|
| 1 | HTTPS 可访问 | `curl https://domain/__health` | `{"status":"ok","version":"v0.4.2"}` |
| 2 | WSS 可连接 | 浏览器 Console: `new WebSocket('wss://domain')` | OPEN |
| 3 | Screen 页面 | 浏览器打开 `https://domain/screen/` | 页面正常加载 |
| 4 | Controller 页面 | 手机打开 `https://domain/controller/` | 页面正常加载 |
| 5 | Admin Dashboard | `https://domain/admin/` | 输入 Token 后正常 |
| 6 | Nginx 反代正常 | 检查 `/__health` 返回 | 无 502/504 |
| 7 | TLS 证书有效 | 浏览器检查证书 | Let's Encrypt / 受信任 CA |
| 8 | Grafana 可访问 | `https://domain:3000` 或 `https://monitor.domain` | Dashboard 正常 |
| 9 | Prometheus 抓取正常 | Grafana → Explore → partygame_* | 有数据 |
| 10 | Redis 持久化 | 重启 server → 房间状态保留 | 房间未丢失 |

### 4.4 生产检查清单

参考 `docs/DEPLOYMENT_CHECKLIST.md` 完整生产部署检查。

---

## 5. 补测通过条件

### 5.1 全部通过（批准 Gate）

```
条件:
  ✅ I2  iOS Safari WSS → PASS
  ✅ W2  iOS 微信 WSS  → PASS
  ✅ A2  Android Chrome WSS → PASS
  ✅ X2  Android 微信 WSS → PASS
  ✅ I6  AudioContext HTTPS → PASS
  ✅ O5+ Grafana / TLS → PASS
  ✅ 0 新增 FAIL
```

满足后执行：

```bash
# 1. 更新模板
# docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md:
#   approval_status = "APPROVED"
#   所有 PENDING 项改为 PASS

# 2. 运行验证
node scripts/phase1-device-qa-summary.js
# 预期输出: PHASE_1_MANUAL_QA_APPROVED=true

# 3. 更新 RELEASE_STATE.json
#   current_phase = "phase_2_canary_1_percent"
#   last_passed_phase = "phase_1_internal_qa"
#   status = "ready_for_canary_1_percent"
#   requires_human_approval = true

# 4. 生成 Gate 报告
# PHASE_1_MANUAL_QA_GATE_REPORT.md
```

### 5.2 任一项 FAIL

```
动作:
  1. Phase 2 保持 BLOCKED
  2. 创建 bugfix 分支: git checkout -b platform/v0.4.3 v0.4.2
  3. 修复问题
  4. 记录到 docs/QA_MOBILE_LOG.md
  5. 重新执行全部 6 项补测
  6. 连续失败 2 次 → 停止，请求人工介入
```

---

## 6. 参考资料

| 文档 | 路径 |
|---|---|
| 部署检查清单 | `docs/DEPLOYMENT_CHECKLIST.md` |
| Runbook | `docs/RUNBOOK.md` |
| 回滚方案 | `docs/ROLLBACK.md` |
| 灰度计划 | `docs/CANARY_PLAN.md` |
| 告警规则 | `docs/ALERT_RULES.md` |
| QA 移动端日志 | `docs/QA_MOBILE_LOG.md` |
| 人工设备 QA 清单 | `docs/MANUAL_DEVICE_QA_CHECKLIST.md` |
| 测试结果模板 | `docs/MANUAL_DEVICE_QA_RESULT_TEMPLATE.md` |
| Release 状态 | `RELEASE_STATE.json` |
