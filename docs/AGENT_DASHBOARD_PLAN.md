# Agent Dashboard Plan — v1.1.1

**Version:** v1.1.1  
**Status:** PLANNING  
**Target:** v1.1.2 (Dashboard implementation)

---

## 1. Architecture

```
React 18 + Next.js (App Router)
  ↳ Embedded in Grafana via iframe widget
  ↳ Data source: Prometheus metrics + JSON API
  ↳ Refresh: 10s auto-poll
```

## 2. Dashboard Panels

### Panel 1: Agent Status

| Metric | Source | Visualization |
|---|---|---|
| Active agents | `agent_turns_total` | Status cards (🟢 IDLE / 🟡 BUSY / 🔴 ERROR) |
| RAG Memory Agent | Custom endpoint | Health check |
| Runtime Triage Agent | Custom endpoint | Health check |
| Token Cost Agent | Custom endpoint | Health check |
| Model Router Agent | Custom endpoint | Health check |

### Panel 2: Runtime Failures

| Metric | Source | Visualization |
|---|---|---|
| Failure rate (24h) | `runtime_failures_total` | Sparkline |
| Failure by category | `runtime_failure_by_category` | Stacked bar |
| MTTR (mean time to recovery) | Calculated | Gauge |
| Recent failures | Playwright test results | Table (last 10) |

### Panel 3: Token Cost

| Metric | Source | Visualization |
|---|---|---|
| Daily token usage | `agent_tokens_total` | Line chart |
| Daily cost ($) | `agent_cost_total` | Line chart |
| Cost by model | Per-model counter | Pie chart |
| Cache hit rate | `agent_cache_hit_rate` | Gauge (target > 50%) |
| Avg latency | `agent_latency_ms` | Gauge |

### Panel 4: Build Queue

| Metric | Source | Visualization |
|---|---|---|
| Pending builds | GitHub Actions queue | Badge |
| Last build status | GH API | Card (🟢/🔴) |
| Last build time | GH API | Time since |
| check-unity-webgl-build.js result | Artifact | 26/26 badge |

### Panel 5: Runtime Artifacts

| Metric | Source | Visualization |
|---|---|---|
| Last screenshot | `artifacts/canvas-loaded.png` | Image thumbnail |
| Last test result | `artifacts/test-results.json` | JSON summary |
| Artifact disk usage | `du -sh artifacts/` | Bar |

### Panel 6: Canary Status

| Metric | Source | Visualization |
|---|---|---|
| Current phase | `RELEASE_STATE.json` | Badge |
| Room count | `partygame_rooms_active` | Line |
| Connection count | `partygame_connections` | Line |
| Error rate | `partygame_errors_total` | Line |
| Admin health | `/admin/health` | 🟢/🔴 |

### Panel 7: Release Gates

| Metric | Source | Visualization |
|---|---|---|
| /runtime-gate status | Last run output | Gate checklist |
| /runtime-automation | Playwright results | Pass/fail matrix |
| Material policy check | check-unity-materials.js | Compliance badge |

### Panel 8: RAG Retrieval History

| Metric | Source | Visualization |
|---|---|---|
| Recent queries | RAG Memory Agent log | Table (last 10) |
| Top categories | Aggregated | Bar chart |
| Cache hit rate | corpus stats | Gauge |

## 3. Technology Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | React + API routes in one |
| Styling | Tailwind CSS | Lightweight, no runtime |
| Charts | recharts | React-native, SVG-based |
| Deployment | Static export → nginx serve | Same server as partygame |
| Embedding | Grafana iframe widget | Existing dashboard integration |

## 4. Data Flow

```
Prometheus (/__metrics)
  → Grafana (for server metrics)
  → Dashboard API (for agent metrics)
    → Next.js API routes
      → React components

GitHub API
  → Dashboard API
    → Build queue panel

Local filesystem
  → Dashboard API (artifacts/, RELEASE_STATE.json)
```

## 5. Implementation Roadmap

| Phase | Deliverable | Target |
|---|---|---|
| v1.1.1 | Plan (this doc) | ✅ Done |
| v1.1.2 | Dashboard skeleton (Next.js project) | Next |
| v1.1.2 | Agent Status + Runtime Failures panels | Next |
| v1.1.3 | Token Cost + Build Queue panels | Later |
| v1.1.3 | Grafana embedding + full integration | Later |

---

**Document Version:** v1.1.1  
**Status:** PLANNING
