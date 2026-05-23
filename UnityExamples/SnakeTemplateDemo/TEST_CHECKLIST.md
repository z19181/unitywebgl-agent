# Snake — TEST_CHECKLIST

## A. 基线回归 (30)

| ID | 测试 | ✅ |
|---|---|---|
| T1 | create_room | ⬜ |
| T2 | join_room PI=0 | ⬜ |
| T3 | inject PI=0 | ⬜ |
| T4 | FAKE PI=999 blocked | ⬜ |
| T5 | second PI=1 | ⬜ |
| T6 | score_update broadcast | ⬜ |
| T7 | game_over broadcast | ⬜ |
| T8 | qrUrl returned | ⬜ |
| T9 | close_room broadcasts | ⬜ |
| T10 | room_not_found after close | ⬜ |
| B1 | default maxPlayers=4 | ⬜ |
| B2 | maxPlayers=2 respected | ⬜ |
| B3 | P0 players list | ⬜ |
| B4 | P1 2 players | ⬜ |
| B5 | room_full | ⬜ |
| B6 | no duplicate PI | ⬜ |
| B7 | P0 tap inject | ⬜ |
| B8 | P1 tap inject | ⬜ |
| B9 | player_left | ⬜ |
| B10 | players.changed after leave | ⬜ |
| B11 | P1 continues after P0 leaves | ⬜ |
| B12 | all receive room_closed | ⬜ |
| C1 | join_room returns reconnectToken | ⬜ |
| C2 | reconnect 5s success | ⬜ |
| C3 | reconnect 10s+ fail | ⬜ |
| C4 | invalid token fail | ⬜ |
| C5 | reconnect then send | ⬜ |
| C6 | reconnected players list | ⬜ |
| C7 | new PI after failed reconnect | ⬜ |
| C8 | other joins during reconnect | ⬜ |

## B. 游戏专项 (10)

| ID | 测试 | ✅ |
|---|---|---|
| G1 | SnakeTemplateDemo 目录完整 | ⬜ |
| G2 | PartyGameBridge 复用 | ⬜ |
| G3 | GameManager 入口 OnPlatformMessage | ⬜ |
| G4 | input.direction 处理 | ⬜ |
| G5 | broadcast state.score_update | ⬜ |
| G6 | broadcast state.game_over | ⬜ |
| G7 | Editor 一键场景脚本 | ⬜ |
| G8 | BUILD_GUIDE.md 存在 | ⬜ |
| G9 | server.js 零修改 | ⬜ |
| G10 | 五条铁律满足 | ⬜ |

## C. 输入协议测试 (4)

| ID | 测试 | ✅ |
|---|---|---|
| I1 | Controller 发送 input.direction "up" | ⬜ |
| I2 | Server 注入 playerIndex → screen | ⬜ |
| I3 | Unity 接收 + 改变方向 | ⬜ |
| I4 | Controller 收到 state.score_update after food | ⬜ |
