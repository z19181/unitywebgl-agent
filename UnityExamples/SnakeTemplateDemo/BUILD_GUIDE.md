# Snake Template Demo — Build Guide

**PartyGameSDK v0.2.7**

## 环境要求

| 工具 | 版本 |
|---|---|
| Unity | 2022.3 LTS+ |
| Node.js | v18+ |

## 导入模板

```bash
cp -r UnityExamples/SnakeTemplateDemo/Assets/*  YourProject/Assets/
```

## 一键生成场景

**Tools → PartyGame → Create Snake Template Scene**

自动创建:
- Main Camera (orthographic, top-down)
- Directional Light
- PartyGameBridge ★
- SnakeGameManager (grid 20x20, tick 0.25s)
- Canvas + Score/Status/GameOver UI

保存到: `Assets/Scenes/SnakeTemplateDemo.unity`

## 选择 WebGL Template

Player Settings → WebGL Template → **PartyGameTemplate**

## Build WebGL

Output to `Build/` folder.

## 接入 Server

```bash
cp -r Build/ PartyGameSDK-MVP/screen-build/
node server/server.js
```

## 扫码测试

### Controller 操作

| 方向 | Controller 发送 |
|---|---|
| 上 | `{event:"game_message", type:"input.direction", data:"\"up\""}` |
| 下 | `data:"\"down\""` |
| 左 | `data:"\"left\""` |
| 右 | `data:"\"right\""` |

使用 Web/controller.html 或修改版 controller 发送方向。

### 链路验证

1. Controller 发送 `input.direction` → Server 注入 `playerIndex`
2. Screen → Unity → SnakeGameManager.OnPlatformMessage
3. 蛇移动 → 吃食物 → `BroadcastScoreUpdate`
4. 撞墙 → `BroadcastGameOver`
5. Controller 收到 `state.score_update` / `state.game_over`

## 常见错误

| 错误 | 解决 |
|---|---|
| 蛇不移动 | 确认 `input.direction` type 正确，data 为 `"up"` 格式 |
| 多人蛇重叠 | 出生位置由 playerIndex 偏移 |
| 食物不生成 | 检查 occupied 集合 |
