# RELEASE_GATE_REPORT_TEMPLATE.md

> **Purpose:** Document a canary phase gate check for the PartyGameSDK release pipeline.
> **Agent:** Release Manager Agent
> **Command:** `/run-release-gate`

---

## Release Gate Identity

| Field | Value |
|---|---|
| **Phase** | `{phase_N}` |
| **Canary %** | `{1 / 10 / 50 / 100}` |
| **Date** | `{YYYY-MM-DD}` |
| **Release Manager** | QClaw Release Manager |
| **Status** | `{PASS / FAIL / BLOCKED}` |

---

## Prerequisites

| Check | Previous Phase | Result |
|---|---|---|
| Phase 1 Internal QA | 53 auto + 27 manual | ✅ |
| Phase 2 (1% canary) | Monitoring stable | ✅ |
| Phase 3 (10% canary) | Grafana readiness | ✅ |
| Phase 4 (50% canary) | 15 health checks | `{✅/⬜}` |
| Phase 5 (100%) | 22 production checks | `{✅/⬜}` |

---

## Health Checks

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | /__health | `{✅/❌}` | `{status, version, uptime}` |
| 2 | /__metrics | `{✅/❌}` | `{N} metrics numeric` |
| 3 | Grafana | `{✅/❌}` | `{panels, datasource}` |
| 4 | Admin | `{✅/❌}` | `{endpoints responding}` |

---

## Error & Performance

| Metric | Threshold | Actual | Status |
|---|---|---|---|
| 5xx Error Rate | < 0.1% | `{N}%` | `{✅/❌}` |
| WS Disconnect Rate | < 5% | `{N}%` | `{✅/❌}` |
| Room Creation | ≥ 99% | `{N}%` | `{✅/❌}` |
| Controller Join | ≥ 99% | `{N}%` | `{✅/❌}` |
| Reconnect | ≥ 80% | `{N}%` | `{✅/❌}` |

---

## Protocol Integrity

| Check | Status |
|---|---|
| game_message.type transparent | ✅ |
| Broadcast intact | ✅ |
| room_closed flow intact | ✅ |
| Reconnect flow intact | ✅ |

---

## Infrastructure

| Component | Status |
|---|---|
| Redis | `{PONG/FAIL}` |
| Nginx | `{UP/DOWN}` |
| WSS | `{configured/missing}` |
| Docker (N containers) | `{healthy/unhealthy}` |

---

## Blocking Conditions

| Condition | Triggered? |
|---|---|
| 5xx ≥ 0.1% | `{no/yes}` |
| WS dc ≥ 5% | `{no/yes}` |
| Room create < 99% | `{no/yes}` |
| Controller join < 99% | `{no/yes}` |
| Reconnect < 80% | `{no/yes}` |
| Grafana down | `{no/yes}` |
| Admin down | `{no/yes}` |
| Redis abnormal | `{no/yes}` |
| Nginx/WSS abnormal | `{no/yes}` |
| Protocol failure | `{no/yes}` |
| Rollback needed | `{no/yes}` |

**Total Blocking: `{N}`**

---

## Decision

| Option | Condition | Selected? |
|---|---|---|
| PROCEED | 0 blocking, all checks pass | `{yes/no}` |
| HOLD | ≤ 2 non-critical warnings | `{yes/no}` |
| ROLLBACK | ≥ 1 blocking condition | `{yes/no}` |

**Recommendation:** `{PROCEED / HOLD / ROLLBACK}`

---

## Next Phase

`{Next phase or action}`

---

**Report Generated:** `{YYYY-MM-DD}`  
**Human Approval Required:** `{yes/no}`
