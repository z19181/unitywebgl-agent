# Runtime Artifact Policy — v1.1.0

**Version:** v1.1.0  
**Scope:** All WebGL runtime automation artifacts  
**Storage:** `tests/runtime/artifacts/` + `.github/artifacts/`

---

## 1. Artifact Types

### 1.1 Screenshots

| Artifact | Format | Location | Retention |
|---|---|---|---|
| Canvas initial state | PNG | `artifacts/canvas-initial.png` | Per-run (overwritten) |
| Canvas after load | PNG | `artifacts/canvas-loaded.png` | Per-run (overwritten) |
| Full page screenshot | PNG | `artifacts/screen-fullpage.png` | Per-run (overwritten) |
| E2E post-input | PNG | `artifacts/e2e-after-input.png` | Per-run (overwritten) |
| Failure screenshots | PNG | `artifacts/screenshots/` | 30 days or until next PASS |

### 1.2 Logs

| Artifact | Format | Location | Retention |
|---|---|---|---|
| Playwright test results | JSON | `artifacts/test-results.json` | Per-run (overwritten) |
| HTML report | HTML | `artifacts/html-report/` | Per-run (overwritten) |
| Console dump | TXT | `artifacts/console-*.txt` | Per-run (overwritten) |
| Trace (on failure) | ZIP | `artifacts/traces/` | 30 days |

### 1.3 Network Traces

| Artifact | Format | Location | Retention |
|---|---|---|---|
| WebSocket message log | JSONL | `artifacts/ws-messages.jsonl` | Per-run (overwritten) |
| HAR network recording | HAR | `artifacts/network.har` | Per-run (optional) |

### 1.4 Runtime Snapshots

| Artifact | Format | Location | Retention |
|---|---|---|---|
| `__PARTYGAME_LAST_STATE__` | JSON | `artifacts/last-state.json` | Per-run (overwritten) |
| `__PARTYGAME_LAST_INPUT__` | JSON | `artifacts/last-input.json` | Per-run (overwritten) |
| Canvas pixel sample | JSON | `artifacts/canvas-sample.json` | Per-run (overwritten) |

---

## 2. Directory Structure

```
tests/runtime/
├── artifacts/
│   ├── canvas-initial.png
│   ├── canvas-loaded.png
│   ├── screen-fullpage.png
│   ├── e2e-after-input.png
│   ├── test-results.json
│   ├── last-state.json
│   ├── last-input.json
│   ├── canvas-sample.json
│   ├── html-report/
│   ├── screenshots/    (failure only, retained 30d)
│   └── traces/         (failure only, retained 30d)
└── ...
```

---

## 3. Artifact Lifecycle

| Event | Action |
|---|---|
| Test run starts | Clean per-run artifacts (overwrite mode) |
| Test PASSES | Keep summary artifacts, discard detailed logs |
| Test FAILS | Save all artifacts, tag with timestamp |
| 30 days since last FAIL | Auto-clean failure artifacts |
| CI run | Upload as GitHub Actions artifact (`.github/artifacts/`) |

---

## 4. .gitignore Rules

```
tests/runtime/artifacts/*
!tests/runtime/artifacts/.gitkeep
```

Per-run artifacts are never committed. Only the directory structure is tracked.

---

## 5. CI Artifact Upload

```yaml
# In GitHub Actions workflow
- uses: actions/upload-artifact@v4
  with:
    name: runtime-artifacts-${{ github.run_id }}
    path: tests/runtime/artifacts/
    retention-days: 30
```

---

## 6. Data Classification

| Data | Sensitivity | Can Commit? |
|---|---|---|
| Screenshots (game scene) | Low — public game content | ❌ No (binary bloat) |
| Test result JSON | Low — pass/fail metrics | ✅ Yes (small, useful for trend) |
| WebSocket traces | Medium — may contain room IDs | ❌ No |
| Console logs | Low | ❌ No (verbose) |
| Last state/input JSON | Low — game data only | ❌ No |

---

**Document Version:** v1.1.0  
**Effective Date:** 2026-05-24
