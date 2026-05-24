# Runtime Triage Agent — v1.1.1

**Type:** Diagnostic & Recovery Agent  
**Authority:** Classify runtime failures, recommend recovery  
**Depends on:** `docs/RUNTIME_FAILURE_MATRIX.md`, RAG Memory Agent

---

## Purpose

When a runtime test fails (Playwright, CI, or manual), the Runtime Triage Agent automatically classifies the failure, assigns severity, and proposes a recovery plan.

## Architecture

```
Runtime Failure Detected
  → classify-runtime-failure.js
  → Match against FAILURE_MATRIX (8 categories)
  → Output: severity, probable cause, recovery plan, suggested rollback
```

## Failure Classification

| Code | Category | Severity | Auto-Detect |
|---|---|---|---|
| `RTE-001` | Loader fail | CRITICAL | curl 404 |
| `RTE-002` | Wasm fail | CRITICAL | Playwright timeout |
| `RTE-003` | Missing shader | HIGH | Visual (pink) |
| `RTE-004` | Black screen | CRITICAL | Pixel sampling |
| `RTE-005` | WebSocket fail | HIGH | Connection error |
| `RTE-006` | Controller desync | HIGH | State timeout |
| `RTE-007` | Runtime timeout | HIGH | Test timeout |
| `RTE-008` | State broadcast fail | HIGH | Hook never fires |

## Severity Levels

| Level | Definition | Action |
|---|---|---|
| **CRITICAL** | Game unplayable. Blocking release. | Immediate fix required. No deployment. |
| **HIGH** | Core feature broken. Can't complete test. | Fix before next canary. |
| **MEDIUM** | Degraded but playable. | Fix in next patch. |
| **LOW** | Cosmetic or non-blocking. | Backlog. |

## Recovery Plan Template

Every classification output includes:

```json
{
  "error_code": "RTE-004",
  "category": "Black screen",
  "severity": "CRITICAL",
  "probable_cause": "HDRP material or missing camera",
  "evidence": "Canvas pixel brightness < 10 at center",
  "recovery_plan": [
    "1. Check scene has active camera",
    "2. Replace all materials with WebGL-safe shaders",
    "3. Verify UNITY_WEBGL_MATERIAL_POLICY.md compliance",
    "4. Rebuild and retest"
  ],
  "suggested_rollback": "Revert to _RuntimeVerifiedTemplate baseline",
  "related_docs": [
    "docs/RUNTIME_FAILURE_MATRIX.md §4",
    "UnityExamples/UNITY_WEBGL_MATERIAL_POLICY.md §1-2"
  ]
}
```

## Integration with RAG

Before classification, the Triage Agent queries the RAG Memory Agent:
```
RAG: "black screen WebGL" → retrieves FAILURE_MATRIX §4 + material policy
Triage Agent: combines RAG context with failure evidence
Output: informed diagnosis with historical context
```
