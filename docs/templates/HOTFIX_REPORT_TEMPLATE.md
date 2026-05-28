# HOTFIX_REPORT_TEMPLATE.md

> **Purpose:** Document an emergency hotfix for PartyGameSDK.
> **Agent:** Platform Agent or Unity WebGL Agent
> **Command:** `/hotfix`

---

## Hotfix Identity

| Field | Value |
|---|---|
| **Hotfix ID** | `hotfix/{YYYY-MM-DD}-{slug}` |
| **Base Version** | `v1.0.0` |
| **Date** | `{YYYY-MM-DD}` |
| **Severity** | `{critical / major / minor}` |
| **Agent** | `{Platform / Unity / DevOps}` |

---

## Issue Description

`{What broke? Include error messages, affected endpoints, user impact}`

---

## Root Cause

`{Why did it happen? What investigation led to this conclusion?}`

---

## Fix

### Files Changed

| File | Change | Reason |
|---|---|---|
| `{path}` | `{description}` | `{why this fixes it}` |
| `{path}` | `{description}` | `{why this fixes it}` |

### Code Diff
```diff
{minimal diff showing the fix}
```

---

## Regression Testing

| Test Suite | Before Fix | After Fix |
|---|---|---|
| Baseline (8 tests) | `{PASS/FAIL}` | `{PASS/FAIL}` |
| Platform (17 tests) | `{PASS/FAIL}` | `{PASS/FAIL}` |
| Multiplayer (22 tests) | `{PASS/FAIL}` | `{PASS/FAIL}` |
| Canary health checks | `{PASS/FAIL}` | `{PASS/FAIL}` |

---

## Protocol Impact

| Constraint | Violated? |
|---|---|
| server.js protocol changed | `{yes/no}` |
| game_message.type transparency broken | `{yes/no}` |
| 5 iron laws violated | `{yes/no}` |
| RELEASE_STATE.json phase changed | `{yes/no}` |

---

## Deployment

```
Branch: hotfix/{YYYY-MM-DD}-{slug}
Commit: {hash}
Tag: v1.0.{N} (requires human approval)

Deploy steps:
1. docker compose -f docker/docker-compose.monitoring.yml down
2. git checkout hotfix/{YYYY-MM-DD}-{slug}
3. docker compose -f docker/docker-compose.monitoring.yml up -d --build
4. Verify health: curl http://localhost/__health
```

---

## Prevention

`{What process or check would have caught this before production?}`

---

## Sign-off

- [ ] Fix verified in staging
- [ ] Full regression suite passes
- [ ] Hotfix tag created (human approved)
- [ ] Release notes updated
- [ ] Hotfix merged to main platform branch

**Approved by:** _{human name}_
