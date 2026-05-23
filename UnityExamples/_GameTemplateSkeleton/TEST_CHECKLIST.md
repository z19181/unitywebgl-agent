# {GameName} — TEST_CHECKLIST

## A. 基线回归 (30)

| ID | 测试 | ✅ |
|---|---|---|
| T1-T10 | v0.2.1 基线 | ⬜ |
| B1-B12 | v0.2.2 多人 | ⬜ |
| C1-C8 | v0.2.3 重连 | ⬜ |

## B. 游戏专项 (10)

| ID | 测试 | ✅ |
|---|---|---|
| G1 | 工程目录完整 | ⬜ |
| G2 | PartyGameBridge 复用 | ⬜ |
| G3 | GameManager 入口正确 | ⬜ |
| G4 | 输入处理正确 | ⬜ |
| G5 | 广播 state.score_update | ⬜ |
| G6 | 广播 state.game_over | ⬜ |
| G7 | Editor 脚本存在 | ⬜ |
| G8 | BUILD_GUIDE 存在 | ⬜ |
| G9 | server.js 零修改 | ⬜ |
| G10 | 五条铁律满足 | ⬜ |

## C. 输入协议测试

| ID | 测试 | ✅ |
|---|---|---|
| I1 | Controller 发送 {input_type} | ⬜ |
| I2 | Server 注入 playerIndex | ⬜ |
| I3 | Unity 接收 + 处理 | ⬜ |
