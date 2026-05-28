# PartyGameSDK Monitoring Stack — v0.3.3

Prometheus + Grafana + Redis + Nginx + 2x PartyGame instances.

---

## Quick Start

```bash
# Generate SSL certs (first time only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem -out docker/nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Start everything
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

## Access

| Service | URL | Credentials |
|---|---|---|
| PartyGame | https://localhost/screen | — |
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | — |
| Health | https://localhost/__health | — |
| Metrics | https://localhost/__metrics | — |

---

## Verify Metrics

### 1. Confirm Prometheus is scraping

```bash
curl -s http://localhost:9090/api/v1/targets | grep -o '"health":"up"'
# Expected: "health":"up" for both partygame-1 and partygame-2
```

Or in browser: Prometheus → Status → Targets → both `partygame` targets should be green "UP".

### 2. Query a metric

```bash
curl -s 'http://localhost:9090/api/v1/query?query=partygame_rooms_active' | python3 -m json.tool
```

### 3. Open Grafana Dashboard

```
http://localhost:3000 → Dashboards → PartyGameSDK Overview
```

Dashboard auto-loads via provisioning — no manual import needed.

---

## Dashboard Panels

### Overview Row
- Active Rooms (stat)
- WS Connections (stat)
- Active Controllers (stat)
- Msg/sec (stat, rate)
- Uptime (stat)

### Room & Connection Row
- Room Lifecycle (timeseries: active/created/destroyed)
- Connections & Controllers (timeseries)

### Messages & Traffic Row
- Message Rate per second (timeseries: received/sent)
- Messages by Type (bargauge)

### Errors & Reconnects Row
- Errors per 5 min (timeseries, by code)
- Reconnects (timeseries: attempts/successes)

### Event Latency Row
- Event Processing Latency (timeseries, by event)
- Error Codes (table)

---

## Metrics List

| Metric | Type | Description |
|---|---|---|
| `partygame_info` | gauge | Version info |
| `partygame_uptime_seconds` | gauge | Process uptime |
| `partygame_rooms_active` | gauge | Current active rooms |
| `partygame_rooms_created_total` | counter | Rooms created |
| `partygame_rooms_destroyed_total` | counter | Rooms destroyed |
| `partygame_ws_connections_active` | gauge | Active WS connections |
| `partygame_controllers_active` | gauge | Active controllers |
| `partygame_messages_received_total` | counter | Messages received |
| `partygame_messages_sent_total` | counter | Messages sent |
| `partygame_messages_rate_per_minute` | gauge | Message rate (approx) |
| `partygame_messages_by_type{type}` | counter | Messages by game type |
| `partygame_messages_by_event{event}` | counter | Messages by event |
| `partygame_errors_total{code}` | counter | Errors by code |
| `partygame_reconnect_attempts_total` | counter | Reconnect attempts |
| `partygame_reconnect_successes_total` | counter | Reconnect successes |
| `partygame_event_duration_ms_avg{event}` | gauge | Event processing latency |

---

## Troubleshooting

### Prometheus shows target DOWN

```bash
# Check if partygame instances are running
docker ps --filter name=partygame

# Check metrics endpoint directly
curl http://localhost:3000/__metrics  # via nginx
curl -s docker inspect partygame-1 | grep IPAddress
curl http://<container-ip>:3000/__metrics
```

### Grafana dashboard not appearing

```bash
# Check provisioning
docker exec grafana cat /etc/grafana/provisioning/dashboards/dashboard.yml

# Restart Grafana
docker-compose -f docker/docker-compose.monitoring.yml restart grafana
```

### No data in panels

1. Check time range (top-right) — set to "Last 5 minutes"
2. Refresh dashboard manually (top-right refresh button)
3. Verify Prometheus data: `curl 'http://localhost:9090/api/v1/query?query=partygame_rooms_active'`
