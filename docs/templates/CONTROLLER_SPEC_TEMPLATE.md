# CONTROLLER_SPEC_TEMPLATE.md

> **Purpose:** Define the mobile controller UI for a party game.
> **Agent:** Platform Agent
> **Reference:** `controller/index.html` (baseline)

---

## Controller Identity

| Field | Value |
|---|---|
| **Game Name** | `{GameName}` |
| **Controller File** | `controller/controller-{gamename}.html` |
| **Created** | `{YYYY-MM-DD}` |

---

## Input Surface

### Layout Zones
```
┌────────────────────┐
│                    │
│    GAME AREA       │
│  (primary input)   │
│                    │
├────────────────────┤
│  SCORE   │  BUTTON │
└────────────────────┘
```

### Input Types

| Type | Binding | Visual |
|---|---|---|
| `input.move` | `{touchmove}` on game area | `{joystick overlay / none}` |
| `input.tap` | `{click / touch}` on button | `{button label}` |
| `input.direction` | `{swipe}` on game area | `{arrow indicators}` |

---

## Message Format

### Outbound (controller → server)
```json
{
  "type": "{game_message}",
  "roomId": "<roomId>",
  "data": {
    "type": "{gameName}.move",
    "x": 0.5,
    "y": 0.3
  }
}
```

### Inbound (server → controller)
```json
{
  "type": "game_state",
  "data": {
    "players": { "0": { "score": 42 }, "1": { "score": 30 } },
    "gameState": "playing"
  }
}
```

---

## UI States

### Waiting for Room
```
┌────────────────────┐
│                    │
│   Room: ABC123     │
│   Players: 1/4     │
│   Waiting...       │
│                    │
│   [QR Code]        │
│                    │
└────────────────────┘
```

### Game Active
```
┌────────────────────┐
│  Score: 42         │
│                    │
│   [Game Area]      │
│                    │
│  ┌──────────────┐  │
│  │  TAP TO JUMP │  │
│  └──────────────┘  │
└────────────────────┘
```

### Game Over
```
┌────────────────────┐
│  GAME OVER         │
│                    │
│  Your Score: 42    │
│  Rank: #1          │
│                    │
│  Leaderboard:      │
│  P1: 42  P2: 30   │
│                    │
└────────────────────┘
```

---

## Mobile Requirements (v0.4.2)

- [ ] Buttons min-height: 44px (touch-friendly)
- [ ] Safe-area CSS: `env(safe-area-inset-*)` for notch/home indicator
- [ ] iOS AudioContext: unlock on first `touchend`
- [ ] WSS auto-detect: `window.location.protocol === 'https:' ? 'wss' : 'ws'`
- [ ] PWA meta: `apple-mobile-web-app-capable`, `viewport`
- [ ] Orientation: handle both portrait and landscape

---

## Compatibility Checklist

| Platform | Browser | Tested? |
|---|---|---|
| iOS | Safari | ⬜ |
| Android | Chrome | ⬜ |
| macOS | Chrome | ⬜ |
| Windows | Chrome | ⬜ |

---

## Notes

`{Any controller-specific notes, edge cases, or accessibility considerations}`
