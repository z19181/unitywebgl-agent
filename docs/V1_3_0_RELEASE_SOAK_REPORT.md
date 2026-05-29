# v1.3.0 Release Soak Report

## Status

LIMITED SOAK - KEEP_RELEASE

## Classification

- `v1.3.0` tag remains a valid release baseline
- current `main` is post-release maintenance and has diverged from the tag baseline
- observability runtime files and regression gates are not present on current `main`
- no evidence of gameplay or protocol regression
- verification is limited to secrets, clean tree, and manual playable smoke

## Tag and Main

- v1.3.0 tag commit: `9e59d83408b50ea56c36a5649e47d4a4d8f8a3c3`
- current main commit: `5742723ac6131da3d1edbb74959fde56331fc3d7`
- post-release maintenance commits after the release tag:
  - `5742723` `chore: preserve build entry and docs`
  - `f37c613` `chore: ignore local env files`
  - `4513a56` `test: confirm playable smoke path`
  - `2df2108` `1`

## Checks

- `node scripts/check-no-secrets.js`: PASS
- `git status --short`: clean
- `node scripts/check-regression-gates.js`: unavailable in current main
- runtime smoke:
  - `curl http://localhost:3000/api/health`: endpoint not available
  - `curl http://localhost:3000/api/metrics`: endpoint not available

## Branch Topology Audit

- Branch containing observability work:
  - no current branch contains commits `16fe92d`, `e73fc01`, or `3184e6d`
  - the release tag snapshot `v1.3.0` does contain the observability files
- Whether `v1.3.0` includes observability:
  - yes
- Whether `main` lost it:
  - yes, current `main` tree does not include `scripts/check-regression-gates.js`, `agent-dashboard/app/api/health/route.ts`, or `agent-dashboard/app/api/metrics/route.ts`
- Whether history rewrite dropped it:
  - effectively yes from the current branch topology; the rewritten `main` no longer carries the observability files that exist in the tag snapshot
- Recovery recommendation:
  - A. keep tag as-is
  - B. restore observability branch: only if future work needs the runtime gates on `main`
  - C. cherry-pick missing observability commits: recommended if soak needs observability restored on `main`
  - D. no action: not recommended

## Limited Soak Assessment

- This is not a full observability soak.
- Verification is limited to secret scanning, clean tree state, and the manual playable smoke path already validated.
- There is no evidence of gameplay or protocol regression in the current maintenance branch.

## Recommendation

- Recommendation: `KEEP_RELEASE`
- `HOTFIX_REQUIRED`: not indicated by current checks
- `RETAG_NOT_ALLOWED`: yes
- `DO_NOT_START_V1_4_0`: yes until branch topology is clarified

## Safety Note

- No tag movement
- No `v1.4.0`
- No `server.js` changes
- No protocol changes
- No `RELEASE_STATE.json` changes
