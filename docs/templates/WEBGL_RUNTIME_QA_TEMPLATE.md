# WEBGL_RUNTIME_QA_TEMPLATE.md

> **Purpose:** Record browser and device runtime QA for a WebGL party game.
> **Agent:** QA Agent
> **Command:** `/team-qa webgl-only`

---

## QA Identity

| Field | Value |
|---|---|
| **Game Name** | `{GameName}` |
| **Build Version** | `v{version}` |
| **Build Output** | `screen/Build_{GameName}/` |
| **QA Date** | `{YYYY-MM-DD}` |
| **QA Agent** | QA Agent |

---

## Browser Tests

### Desktop

| # | Test | Chrome | Safari | Firefox | Edge |
|---|---|---|---|---|---|
| 1 | Canvas renders | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | FPS ≥ 30 | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | No WebGL errors in console | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Screen resize handles correctly | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Fullscreen mode works | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Audio plays (if applicable) | ⬜ | ⬜ | ⬜ | ⬜ |

### Mobile

| # | Test | iOS Safari | Android Chrome |
|---|---|---|---|
| 7 | Canvas renders | ⬜ | ⬜ |
| 8 | Touch input registers | ⬜ | ⬜ |
| 9 | FPS ≥ 15 | ⬜ | ⬜ |
| 10 | Safe-area respects notch | ⬜ | ⬜ |
| 11 | No zoom on double-tap | ⬜ | ⬜ |
| 12 | Orientation change handles | ⬜ | ⬜ |
| 13 | iOS AudioContext unlocked | ⬜ | N/A |
| 14 | Keyboard doesn't obscure | N/A | ⬜ |

---

## Controller Tests

| # | Test | Result |
|---|---|---|
| 15 | QR code scannable | ⬜ |
| 16 | Join room successfully | ⬜ |
| 17 | Input sends to game | ⬜ |
| 18 | Score updates display | ⬜ |
| 19 | Game over screen appears | ⬜ |
| 20 | Room close handled gracefully | ⬜ |
| 21 | Reconnect after refresh | ⬜ |

---

## Multi-Player Tests

| # | Test | Players | Result |
|---|---|---|---|
| 22 | 2 players join and play | 2 | ⬜ |
| 23 | 4 players join and play | 4 | ⬜ |
| 24 | Player leaves mid-game | 2→1 | ⬜ |
| 25 | All players leave | 4→0 | ⬜ |
| 26 | Room full (max players) | N+1 | ⬜ |

---

## Performance

| Metric | Value | Budget | Status |
|---|---|---|---|
| Load time (first paint) | `{N}s` | < 5s | ⬜ |
| Load time (interactive) | `{N}s` | < 10s | ⬜ |
| Memory (peak) | `{N} MB` | < 256 MB | ⬜ |
| wasm size | `{N} MB` | < 50 MB | ⬜ |
| data size | `{N} MB` | < 20 MB | ⬜ |

---

## Issues Found

| # | Severity | Description | Status |
|---|---|---|---|
| 1 | `{critical / major / minor}` | `{description}` | `{open / fixed / deferred}` |
| 2 | `{critical / major / minor}` | `{description}` | `{open / fixed / deferred}` |

---

## Summary

| Category | Passed | Total |
|---|---|---|
| Browser (Desktop) | `{N}` | 6 |
| Browser (Mobile) | `{N}` | 8 |
| Controller | `{N}` | 7 |
| Multi-Player | `{N}` | 5 |
| Performance | `{N}` | 5 |
| **Total** | `{N}` | **31** |

**Verdict:** `{PASS / FAIL / CONCERNS}`
