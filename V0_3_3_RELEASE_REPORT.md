# PartyGameSDK v0.3.3 发布报告

**发布日期:** 2026-05-23  
**版本类型:** 可观测性 — Prometheus + Grafana 自动配置 Dashboard  
**基调:** 一键监控 — 6 个容器启动，12 面板自动加载

---

## 1. 版本信息

| 项目 | 内容 |
|---|---|
| **版本号** | v0.3.3 |
| **Git Tag** | `v0.3.3` |
| **Commit** | `bc693f2` |
| **分支** | `platform/v0.3.3` |
| **基线** | v0.3.2 |
| **MemoryStore** | 60/60 PASS ✓ |
| **Grafana 专项** | 10/10 PASS ✓ |
| **协议** | 零修改 |
| **五条铁律** | 全部保持 |

---

## 2. 新增能力

### 2.1 Prometheus 配置

`docker/prometheus/prometheus.yml` — 自动抓取 2 个实例:

```yaml
global:
  scrape_interval: 10s

scrape_configs:
  - job_name: 'partygame'
    static_configs:
      - targets: ['partygame-1:3000', 'partygame-2:3000']
```

### 2.2 Grafana 自动部署

- **Datasource** — 自动配置 Prometheus (无手动操作)
- **Dashboard** — 自动加载 `partygame-sdk-overview.json` (12 panels)
- **Credentials** — admin/admin

### 2.3 Grafana Dashboard (12 panels)

| Row | Panel | Type | Query |
|---|---|---|---|
| **Overview** | Active Rooms | Stat | `partygame_rooms_active` |
| | WS Connections | Stat | `partygame_ws_connections_active` |
| | Active Controllers | Stat | `partygame_controllers_active` |
| | Msg/sec | Stat | `rate(partygame_messages_received_total[1m])` |
| | Uptime | Stat | `partygame_uptime_seconds` |
| **Room & Connection** | Room Lifecycle | Timeseries | active/created/destroyed |
| | Connections & Controllers | Timeseries | WS + controllers |
| **Messages & Traffic** | Message Rate | Timeseries | received/sent per second |
| | Messages by Type | Bargauge | `sum by(type)` |
| **Errors & Reconnects** | Errors (5min) | Timeseries | `rate(errors_total[5m])` |
| | Reconnects | Timeseries | attempts/successes |
| **Event Latency** | Processing Latency | Timeseries | `duration_ms_avg{event}` |

### 2.4 增强指标

| 指标 | 类型 | 版本 |
|---|---|---|
| `partygame_controllers_active` | gauge | v0.3.3 new |
| `partygame_messages_by_type{type}` | counter | v0.3.3 new |
| `partygame_messages_by_event{event}` | counter | v0.3.3 new |
| `partygame_event_duration_ms_avg{event}` | gauge | v0.3.3 new |
| `partygame_info{version}` | gauge | v0.3.3 new |
| `partygame_uptime_seconds` | gauge | v0.3.3 new |

### 2.5 Docker 一键启动

`docker/docker-compose.monitoring.yml` — 6 services:

```
nginx :443    prometheus :9090    grafana :3000
redis         partygame-1         partygame-2
```

---

## 3. 修改文件清单

| 文件 | 类型 | 说明 |
|---|---|---|
| `docker/prometheus/prometheus.yml` | 新增 | scrape config |
| `docker/grafana/provisioning/datasources/prometheus.yml` | 新增 | auto datasource |
| `docker/grafana/provisioning/dashboards/dashboard.yml` | 新增 | auto dashboard |
| `docker/grafana/dashboards/partygame-sdk-overview.json` | 新增 | 12 panel dashboard |
| `docker/docker-compose.monitoring.yml` | 新增 | 6 services |
| `docker/monitoring/README.md` | 新增 | 使用方法 + 排查 |
| `server/metrics/index.js` | 修改 | +6 新指标 |
| `server/server.js` | 修改 | +3 行 (controllersActive, eventDuration) |

---

## 4. 测试结果

| 套件 | 结果 |
|---|---|
| MemoryStore (A+B+C+D+E+F) | 60/60 ✅ |
| Grafana 专项 (G1-G10) | 10/10 ✅ |

---

## 5. Docker 运行

```bash
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Access
open http://localhost:3000      # Grafana (admin/admin)
open http://localhost:9090      # Prometheus
open https://localhost/screen   # PartyGame
```

---

**签名:** QClaw Agent  
**日期:** 2026-05-23
