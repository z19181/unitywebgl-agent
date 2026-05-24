# Path-Scoped Rules — PartyGameSDK v1.0.0

**Version:** v1.0.1-governance  
**Inspired by:** Claude-Code-Game-Studios rules system  
**Principle:** Rules apply based on file path. Agents working in a path must read its rules before modifying files.

---

## `server/**`

### SRV-001: Protocol Transparency
`server.js` MUST NOT parse `game_message.type`. It routes game messages blindly. Type inspection is a BLOCKING violation.

### SRV-002: PlayerIndex Assignment
`playerIndex` is assigned by `server.js` only. Controller MUST NOT send it. Server injects it before routing.

### SRV-003: State Management
Room state (players list, active rooms) is managed by `server/store/`. No hardcoded room state in route handlers.

### SRV-004: Metrics Integrity
`server/metrics/index.js` MUST NOT return `[object Promise]` or any non-numeric value. All gauge/counter values must be parseable by Prometheus.

### SRV-005: Admin API
`server/admin.js` routes are read-only (health, rooms). No write operations without Release Manager approval.

### SRV-006: Error Codes
`server/errors.js` error codes follow semantic naming. No magic numbers in `sendErrorCode()` calls.

---

## `controller/**`

### CTRL-001: Input-Only
Controller sends `{ type, roomId, data }`. No `playerIndex` in outbound messages. Violation is BLOCKING.

### CTRL-002: UI from State
Controller updates UI from `game_state` messages only. No UI updates based on local input alone.

### CTRL-003: Reconnect Guard
Controller checks `isRoomOpen` before sending messages. Messages to closed rooms are silently dropped.

### CTRL-004: WSS Auto-Detect
`ws://` vs `wss://` determined by `window.location.protocol`. No hardcoded protocol.

### CTRL-005: Mobile Compat
Buttons min-height: 44px. Safe-area CSS variables for notches. iOS AudioContext unlock on first touch.

---

## `screen/**`

### SCRN-001: Forward-Only
Screen forwards all server messages to Unity via `forwardToUnity()`. Screen MUST NOT compute scores, winners, or game state.

### SCRN-002: Event Completeness
`handlePlayerJoined` and `handlePlayerLeft` MUST call `forwardToUnity`. Missing forward is a BLOCKING bug.

### SCRN-003: QR Code
QR code generated with CDN fallback. Must work when QR library CDN is unavailable (plain text URL fallback).

### SCRN-004: Orientation
Screen handles orientation changes on tablets. `orientationchange` listener registered.

---

## `UnityExamples/**`

### UNI-001: Bridge Integrity
`PartyGameBridge.jslib` MUST NOT be modified. It is a binary compatibility contract between Unity and the WebGL template.

### UNI-002: Platform Scripts
`Assets/Scripts/Platform/` files are READ-ONLY. Copied from `_GameTemplateSkeleton`, never modified per-game.

### UNI-003: Template Structure
`WebGLTemplates/PartyGameTemplate/` is READ-ONLY. All games share the same template.

### UNI-004: Build Validation
Every new game MUST pass `check-unity-webgl-build.js` → 22/22 before release. No exceptions.

### UNI-005: Font Compatibility
`Arial.ttf` is removed in Unity 6. Use `LegacyRuntime.ttf` in all scene creator scripts.

---

## `Assets/Scripts/Game/**`

### GAME-001: Manager Pattern
Each game has exactly one `{GameName}GameManager.cs` extending `MonoBehaviour`. It registers with `PartyGameBridge` and handles `ServerMessage` events.

### GAME-002: State Broadcasting
Game state changes broadcast via `PartyGameBridge.SendToServer()`. No direct WebSocket access.

### GAME-003: Player Events
`player_joined` → spawn entity. `player_left` → remove entity. `game_message` → process input. Each case handled explicitly.

### GAME-004: Physics Module Declaration
If game uses `Rigidbody2D`, `Collision2D`, or `Physics2D`, declare `com.unity.modules.physics2d` in `Packages/manifest.json`.

---

## `docs/**`

### DOC-001: Template Completeness
All reports follow their template. Missing sections flagged.

### DOC-002: Phase Report Naming
Phase reports follow: `PHASE_{N}_{DESCRIPTION}_REPORT.md`. Handoff docs named in UPPER_SNAKE_CASE.

### DOC-003: No Stale References
All file paths in docs reference existing files. Broken links are BLOCKING for release reports.

---

## `scripts/**`

### SCR-001: Idempotency
Build check scripts produce the same output for the same input. No timestamp-dependent assertions.

### SCR-002: Exit Codes
Scripts exit 0 on success, non-zero on failure. `check-unity-webgl-build.js` exits 0 only when 22/22 pass.

### SCR-003: Shell Compatibility
Shell scripts use POSIX syntax (`#!/bin/sh`). No `grep -P` (Perl regex breaks on non-GNU grep). Python scripts use `python3`.

---

## `agents/**`

### AGT-001: Skill Boundaries
Agent skill files declare their domain. Cross-domain file modifications require Release Manager approval.

### AGT-002: Collaboration Protocol
Follow: Question → Options → Decision → Draft → Approval → Write. Never skip steps.

### AGT-003: Audit Trail
Significant agent decisions logged to `docs/agent-decisions/YYYY-MM-DD.md`.

---

## Rule Severity

| Tag | Meaning | Blocks Phase? |
|---|---|---|
| BLOCKING | Violation blocks canary advancement | YES |
| WARNING | Should be fixed, doesn't block | NO |
| INFO | Best practice reference | NO |

---

## How Rules Are Enforced

1. **Hooks** — `hooks/validate-iron-laws.sh` checks on session start
2. **Gate checks** — `/run-release-gate` validates all path rules for the phase
3. **Code review** — Path-scoped rules are the review checklist
4. **Agent scoping** — Agents only read/write their path domains

---

**Adapted from:** Claude-Code-Game-Studios path-scoped rules system  
**PartyGameSDK adaptation:** 8 paths, 30 rules, 3 severity levels
