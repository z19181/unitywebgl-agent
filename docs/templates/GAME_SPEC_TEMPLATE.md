# GAME_SPEC_TEMPLATE.md

> **Purpose:** Define a new party game for the PartyGameSDK pipeline.
> **Agent:** Unity WebGL Game Agent
> **Command:** `/new-party-game`

---

## Game Identity

| Field | Value |
|---|---|
| **Game Name** | `{GameName}` |
| **Game Type** | `{jump / snake / puzzle / breakout / racing / quiz / other}` |
| **Created** | `{YYYY-MM-DD}` |
| **Template From** | `_GameTemplateSkeleton` |

---

## Core Mechanics

### One-line Description
`{One sentence describing what the player does}`

### Player Controls
| Input Type | Binding | Description |
|---|---|---|
| `{input.move}` | `{touch-drag / tilt / keyboard}` | `{What the player controls}` |
| `{input.tap}` | `{tap / click}` | `{What tapping does}` |
| `{input.direction}` | `{swipe}` | `{What swiping does}` |

### Core Loop
```
{Player action} → {Game response} → {Feedback} → {Repeat}
```

---

## Unity Architecture

### GameManager
```
Class: {GameName}GameManager.cs
Path: Assets/Scripts/Game/
```

### Scene
```
Scene creator: Assets/Editor/Create{GameName}Scene.cs
Template Scene: Assets/Scenes/{GameName}TemplateDemo.unity
```

### Required Modules
| Module | Needed? | Reason |
|---|---|---|
| `com.unity.modules.physics2d` | `{yes/no}` | `{Collision2D / Rigidbody2D}` |
| `com.unity.modules.ui` | `{yes/no}` | `{Canvas / Text}` |

---

## Game State

### State Object
```json
{
  "players": {
    "<playerIndex>": {
      "position": {"x": 0, "y": 0},
      "score": 0,
      "alive": true
    }
  },
  "gameState": "{waiting / playing / over}",
  "leaderboard": []
}
```

### State Transitions
| Event | From | To |
|---|---|---|
| All players joined | `waiting` | `playing` |
| Game over condition | `playing` | `over` |

---

## Input Messages

| `game_message.type` | Data Payload | Direction |
|---|---|---|
| `{gameName}.move` | `{ x: number, y: number }` | controller → Unity |
| `{gameName}.tap` | `{}` | controller → Unity |
| `{gameName}.direction` | `{ direction: "up"/"down"/"left"/"right" }` | controller → Unity |

---

## Build Pipeline

| Step | Tool |
|---|---|
| Scene creation | Unity Editor → `Create{GameName}Scene.cs` |
| WebGL Build | `EMSDK_PYTHON=python3.11 Unity -batchmode -executeMethod {GameName}WebGLBuilder.BuildWebGL` |
| Artifact check | `node scripts/check-unity-webgl-build.js screen/Build_{GameName}` |
| Browser verification | Safari / Chrome canvas rendering |
| QA gate | Manual QA checklist |

---

## Known Limitations

`{List any known limitations or edge cases}`

---

## Acceptance Criteria

- [ ] `{GameName}GameManager.cs` compiles without errors
- [ ] `Create{GameName}Scene.cs` generates valid scene
- [ ] Build produces valid WebGL artifacts
- [ ] `check-unity-webgl-build.js` → 22/22 PASS
- [ ] Canvas renders in Safari and Chrome
- [ ] Controller can join and send inputs
- [ ] Game state updates and broadcasts correctly
