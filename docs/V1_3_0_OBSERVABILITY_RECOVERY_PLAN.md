# v1.3.0 Observability Recovery Plan

## Status

- `v1.3.0` tag includes observability and regression gate files.
- current `main` is post-release maintenance and currently lacks those observability/gate files.
- tag must not move.
- release remains valid.
- full observability soak is unavailable from current `main`.

## Options

### A. Keep tag as-is

- Required.
- No action.
- Preserve `v1.3.0` as the release baseline.

### B. Cherry-pick missing observability files from `v1.3.0` tag

- Safest recovery if `main` should regain observability.
- Target files:
  - `scripts/check-regression-gates.js`
  - `agent-dashboard/app/api/health/route.ts`
  - `agent-dashboard/app/api/metrics/route.ts`
  - `metrics/`
  - `health/`
  - `.github/workflows/runtime-regression.yml`
  - `docs/V1_3_0_PHASE_C_OBSERVABILITY_REPORT.md`
  - `docker/prometheus/prometheus.yml`
  - `next.config.js` if changed

### C. Restore observability branch from tag

- Create a branch from the release baseline:
  - `git checkout -b restore/v1.3.0-observability v1.3.0`
- Compare against `main`.
- Cherry-pick or merge selectively.

### D. No action

- Acceptable only if observability is not needed on `main`.
- Not recommended if `main` needs the runtime gates.

## Recommendation

- Recommended path: `B` first.
- Use `C` if `B` is risky or too noisy.
- Do not retag.

## Constraints

- No tag movement.
- No force push for recovery planning.
- No `v1.4.0`.
- No `server.js`.
- No protocol changes.
- No `RELEASE_STATE.json`.
- No runtime edits yet.
