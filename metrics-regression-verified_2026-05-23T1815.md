# Metrics Bugfix Regression — Verified

## Date: 2026-05-23T18:15 PDT

## Code Audit

| Store | getActiveRooms input | Fix |
|---|---|---|
| MemoryStore | `store.rooms.size` (synchronous number) | No change needed |
| RedisStore | `store.getRoomCount().then(...)` (Promise) | `typeof result.then === 'function'` guard at line 54 |

## Live Verification

| # | Check | Result |
|---|---|---|
| 1 | Code audit covers both stores | ✅ |
| 2 | /__metrics: no [object Promise] | ✅ |
| 3 | rooms/ws/controllers_active: numeric | ✅ 0, 0, 0 |
| 4 | Prometheus targets: UP | ✅ 3/3 |
| 5 | Grafana dashboard + datasource | ✅ 19 panels, health OK |

## Phase 4: GO

phase_4_canary_50_percent confirmed.

## Commit
0de84c3
