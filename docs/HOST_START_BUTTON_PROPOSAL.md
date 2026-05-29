# Host Start Button Proposal

## 1. Current Behavior

- Screen creates a room and renders a QR code.
- Controller joins the room after scan.
- Player presses the big controller button to send input.
- The first real input triggers Unity player spawn.
- The game starts implicitly on the first input.

What the screen shows now:

- `Waiting for players` until real input arrives.
- This is expected behavior, not a crash.
- The screen can look idle even when the room is valid.

## 2. UX Problem

- Players may think the screen is stuck because nothing visibly starts after join.
- The host cannot coordinate all players before gameplay begins.
- There is no explicit `ready` or `start` phase.
- New users may not understand that the first input is the real game trigger.

## 3. Proposed Host-Start Design

Goal:

- Add a host start button on the screen.
- Avoid changing `server.js` if possible.
- Avoid breaking protocol compatibility.
- Reuse the existing room, WebSocket, and broadcast/game_message flow when possible.

### Suggested behavior

- Controllers join as they do today.
- Screen shows connected players before the match starts.
- Host clicks `Start`.
- Unity receives a `start_game` message or equivalent start signal.
- Player spawn and gameplay begin from the start signal, not from the first input.

## 4. State Machine

- `WAITING_FOR_PLAYERS`
- `READY_TO_START`
- `GAME_RUNNING`
- `GAME_OVER`

### State notes

- `WAITING_FOR_PLAYERS`: room exists, not enough players or not ready yet.
- `READY_TO_START`: enough players joined, host can start manually.
- `GAME_RUNNING`: Unity gameplay is active.
- `GAME_OVER`: match finished, show results and allow restart or room reset.

## 5. Minimal Implementation Plan

### Option A: Screen-side only host start

- Keep controller behavior as-is.
- Let the screen count connected players.
- Add a host-facing `Start` button on the screen.
- When host clicks `Start`, send a start signal into the existing flow.
- Unity spawns players and begins gameplay on that signal.
- First input is no longer required to start the match.

Why this is preferred:

- Lowest risk.
- Does not require `server.js` changes.
- Preserves existing controller protocol.
- Limits the change to screen UI and Unity-side handling.

### Option B: Server-mediated start

- Add room state to the server.
- Broadcast a `game_started` event.
- Make all clients observe server-managed match phases.

Why this is higher risk:

- Requires protocol review.
- Touches server behavior.
- Has higher regression risk across screen and controller flows.

## 6. Hard Constraints

- Do not modify `server.js` in the first proposal.
- Do not break controller protocol compatibility.
- Do not change game_message transparency.
- Do not modify `RELEASE_STATE.json`.
- Do not add a tag.

## 7. Acceptance Criteria

- The screen no longer appears stuck after room creation.
- Joined players are visible before the match starts.
- Host can start the match manually.
- Controller input is ignored or queued before start.
- Unity spawns players on start, or on the first ready event after start.

## Recommendation

Recommended option: **Option A, screen-side only host start**.

Implementation risk: **Low to medium**.

- Low risk because it avoids server changes.
- Medium because Unity and screen UI must agree on the new start phase.
