# Model Router Agent — v1.1.1

**Type:** Orchestration Agent  
**Authority:** Route tasks to appropriate model tier based on complexity  
**Depends on:** RAG Memory Agent for task classification

---

## Purpose

Optimize token cost and quality by routing tasks to the right model. Simple tasks (formatting, docs, refactors) use cheaper models. Complex tasks (runtime failures, architecture, governance) use stronger models.

## Routing Strategy

```
Task Received
  → ModelRouter classifies task complexity
  → Applies routing rules
  → Selects model
  → Fallback on timeout/error
```

## Model Tiers

| Tier | Models | Use For |
|---|---|---|
| **Cheap** | deepseek-v4-pro (low reasoning) | Formatting, docs, simple refactors, report generation |
| **Strong** | deepseek-v4-pro (high reasoning), claude-sonnet-4 | Runtime failures, architecture, governance, shader/webgl debugging |
| **Fallback** | gpt-4o | When primary model times out or errors |

## Routing Rules

### Cheap Model Tasks

| Task Pattern | Reason |
|---|---|
| `/format`, `/lint`, `/style` | No reasoning needed |
| `create report`, `generate doc` | Template filling |
| `update CHANGELOG`, `bump version` | Mechanical |
| `rename`, `move file`, `copy` | File operations |
| `git commit`, `git log` | Mechanical |

### Strong Model Tasks

| Task Pattern | Reason |
|---|---|
| `black screen`, `shader error`, `HDRP` | WebGL debugging is complex |
| `runtime failure`, `wasm error` | Requires deep analysis |
| `architecture review`, `governance` | High-stakes decisions |
| `new game template`, `new feature` | Creative + structural |
| `protocol change` (BLOCKED anyway) | Catches violations |
| `release gate`, `canary` | Production decisions |

### Fallback Strategy

| Condition | Action |
|---|---|
| Primary model timeout (>60s) | Retry with fallback model |
| Primary model rate-limited (429) | Wait 5s, retry once |
| Primary model error (5xx) | Immediately fallback |
| 3 consecutive fallbacks | Alert: model availability issue |

## Classification Keywords

The Model Router classifies tasks by scanning for keywords:

```json
{
  "cheap_keywords": ["report", "doc", "format", "lint", "rename", "commit", "bump"],
  "strong_keywords": ["black screen", "shader", "HDRP", "crash", "wasm", "timeout",
                       "architecture", "governance", "protocol", "release gate",
                       "new game", "feature", "WebGL", "runtime failure"],
  "blocked_keywords": ["modify server.js", "change protocol", "modify core"]
}
```
