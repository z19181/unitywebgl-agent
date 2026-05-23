# Unity WebGL Real Build Gate

**创建时间:** 2026-05-23  
**当前状态:** 4/10 人工验证通过  
**人工验证环境:** Safari (macOS)

---

## Gate 名称

**Unity WebGL Real Build Gate**  
— 验证 Unity 6 WebGL Build 产物在真实浏览器中端到端运行

## 验证结果

| # | 验证项 | Result | Notes |
|---|---|---|---|
| 1 | Screen 页面可访问 | ✅ PASS | Safari → `http://localhost:3000/screen/` |
| 2 | Unity canvas 渲染 | ✅ PASS | 非 SDK-only mode，Unity 场景可见 |
| 3 | Build 产物加载 | ✅ PASS | 场景成功渲染 = 产物已加载 |
| 4 | Unity 初始化完成 | ✅ PASS | JumpJump 游戏场景已显示 |
| 5 | Controller 加入房间 | ⬜ | |
| 6 | 输入消息发送 | ⬜ | |
| 7 | game_message 转发 | ⬜ | |
| 8 | Unity 收到 OnPlatformMessage | ⬜ | |
| 9 | Unity 广播 state.score_update | ⬜ | |
| 10 | Controller 分数更新 | ⬜ | |

**已验证:** 4/10 ✅  
**判定:** PARTIAL (Unity 渲染链确认，端到端游戏链路待验证)

## 验证前提

```bash
cd PartyGameSDK-MVP
node server/server.js   # 默认 3000，如冲突用 PORT=3001
```

## 剩余步骤

### Step 1: 打开 Controller

复制 screen 上显示的 Room ID，访问：
`http://localhost:3000/controller?room=<ROOM_ID>`

**预期:** Controller 页面显示 "Connected" + "Joined as P0"

### Step 2: 测试输入链路

1. 在 controller 按住蓄力按钮 → DevTools Network → WS 中看到 `"type":"input.charge_start"`
2. 松手 → `"type":"input.charge_end"`
3. screen Console → 搜索 `Forwarding to Unity`
4. Console → `[PartyGameBridge.jslib]`
5. Console → `broadcast` / `state.score_update`
6. controller → score 非零

## 通过后

- `CODEX_RESULT.md` 维持 PASS
- Unity WebGL Agent 标记为 **verified**

## 禁止

- 修改 PartyGameSDK 核心协议
- 修改五条铁律
- 修改 `RELEASE_STATE.json`
- 打 release tag
