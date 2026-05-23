# PartyGameSDK v0.4.0 — Alert Rules

> Prometheus alert rules. 存放于 `docker/prometheus/alerts.yml` 或直接在 `prometheus.yml` 中引用。

```yaml
groups:
  - name: partygame
    rules:
      # ── Server ──
      - alert: PartyGameServerDown
        expr: up{job="partygame"} == 0
        for: 2m
        labels: { severity: critical }
        annotations:
          summary: "PartyGame server {{ $labels.instance }} is down"
          description: "Server has been down for >2 minutes."

      - alert: PartyGameHighRestartRate
        expr: rate(partygame_info[5m]) > 0.05
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "High restart rate detected"

      # ── Rooms ──
      - alert: PartyGameNoRooms
        expr: partygame_rooms_active == 0
        for: 10m
        labels: { severity: info }
        annotations:
          summary: "No active rooms for 10 minutes (possible issue or idle period)"

      - alert: PartyGameRoomCreateFailure
        expr: rate(partygame_rooms_created_total[5m]) == 0 and rate(partygame_messages_received_total[5m]) > 0
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Messages received but no rooms created — possible create_room failure"

      # ── Errors ──
      - alert: PartyGameHighErrorRate
        expr: rate(partygame_errors_total[5m]) > 0.5
        for: 5m
        labels: { severity: critical }
        annotations:
          summary: "High error rate: {{ $value }}/s"
          description: "Error code: {{ $labels.code }}"

      - alert: PartyGameFakePlayerIndex
        expr: rate(partygame_errors_total{code="5001"}[5m]) > 0.1
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Fake playerIndex detected — possible malicious client"

      # ── Reconnect ──
      - alert: PartyGameHighReconnectFailure
        expr: rate(partygame_reconnect_attempts_total[5m]) > 0
          and rate(partygame_reconnect_successes_total[5m]) / rate(partygame_reconnect_attempts_total[5m]) < 0.5
        for: 10m
        labels: { severity: warning }
        annotations:
          summary: "Reconnect success rate < 50% over 10 minutes"

      # ── WebSocket ──
      - alert: PartyGameHighWSDisconnect
        expr: rate(partygame_ws_connections_active[5m]) < -1
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Rapid WebSocket disconnections detected"

      # ── Redis ──
      - alert: PartyGameRedisDown
        expr: redis_up{job="redis"} == 0
        for: 1m
        labels: { severity: critical }
        annotations:
          summary: "Redis is down"

      # ── Admin ──
      - alert: PartyGameAdminUnauthorizedSpike
        expr: rate(partygame_errors_total{code="401"}[5m]) > 2
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Admin unauthorized access spike — possible brute force"

      # ── Latency ──
      - alert: PartyGameHighLatency
        expr: partygame_event_duration_ms_avg > 500
        for: 5m
        labels: { severity: warning }
        annotations:
          summary: "Event processing latency > 500ms for {{ $labels.event }}"
```

## 集成方式

在 `docker/prometheus/prometheus.yml` 中添加:

```yaml
rule_files:
  - 'alerts.yml'
```

## 通知渠道 (配置示例)

```yaml
# alertmanager.yml
route:
  receiver: 'slack-partygame'
receivers:
  - name: 'slack-partygame'
    slack_configs:
      - channel: '#party-game-alerts'
```
