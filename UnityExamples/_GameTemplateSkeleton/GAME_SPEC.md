# {GameName} — GAME_SPEC

## 游戏概述

<!-- 1-2 句描述游戏 -->

## 输入类型

| Type | Data | 说明 |
|---|---|---|
| `input.{type}` | `{format}` | <!-- 说明 --> |

## 游戏规则

<!-- 规则描述 -->

## 广播

| Type | 触发条件 |
|---|---|
| `state.score_update` | <!-- 何时广播分数 --> |
| `state.game_over` | <!-- 何时结束 --> |

## 组件列表

| 脚本 | 职责 |
|---|---|
| `{GameName}GameManager.cs` | 核心逻辑 |
| `{Component}.cs` | <!-- 职责 --> |
