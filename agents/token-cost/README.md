# Token Cost Agent — v1.1.1

**Type:** Observability Agent  
**Authority:** Track and report AI token/cost metrics  
**Exports:** Prometheus metrics on `/__metrics`

---

## Purpose

Track token usage, estimated cost, latency, and cache hit rates across all Agent interactions (QClaw, Codex, downstream agents). Export as Prometheus metrics for Grafana dashboards.

## Metrics Exported

| Metric | Type | Description |
|---|---|---|
| `agent_tokens_total` | Counter | Total input + output tokens per agent |
| `agent_tokens_per_turn` | Histogram | Tokens per interaction turn |
| `agent_cost_total` | Counter | Estimated USD cost (pricing-based) |
| `agent_latency_ms` | Histogram | End-to-end latency per turn |
| `agent_cache_hit_rate` | Gauge | Fraction of turns with LCM cache hit |

## Model Pricing (Estimated)

| Model | Input $/1M tokens | Output $/1M tokens |
|---|---|---|
| deepseek-v4-pro | $2.50 | $8.00 |
| claude-sonnet-4-20250514 | $3.00 | $15.00 |
| gpt-4o | $2.50 | $10.00 |

## Integration

```
QClaw completes turn
  → TokenCost metrics.js records usage
  → Exposed on /__metrics (merged with existing server metrics)
  → Grafana dashboard: Agent Cost panel
```
