# Snake — GAME_SPEC

## 游戏概述

经典贪吃蛇。多人在同一网格中各自操控一条蛇。吃红色食物增长，撞墙或撞到自己/其他蛇结束。

## 输入类型

| Type | Data | 说明 |
|---|---|---|
| `input.direction` | `"up"/"down"/"left"/"right"` | 改变蛇的方向 |

## 游戏规则

- 网格 (20x20)，定时 tick (0.25s)
- 方向不可反向（up ↔ down, left ↔ right 忽略）
- 每个 controller 独立一条蛇（不同颜色）
- 吃食物：蛇长度 +1，分数 +1
- 死亡条件：撞墙 / 撞自己 / 撞其他蛇
- 全部死亡 → 游戏结束

## 广播

| Type | 触发条件 |
|---|---|
| `state.score_update` | 每次吃食物 |
| `state.game_over` | 所有蛇都死亡 |

## 组件列表

| 脚本 | 职责 |
|---|---|
| `SnakeGameManager.cs` | 网格/蛇/食物/碰撞/计分/广播 |
| `SnakeUIManager.cs` | 分数/状态/结束 UI |
| `CreateSnakeScene.cs` | 一键场景生成 |
