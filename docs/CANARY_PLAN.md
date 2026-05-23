# PartyGameSDK v0.4.0 — Canary Release Plan

## 目标

将 PartyGameSDK v0.4.0 以灰度方式推送到生产环境，最小化风险。

---

## 灰度策略

| 阶段 | 流量比例 | 持续时间 | 监控窗口 | 决策人 |
|---|---|---|---|---|
| **Phase 1** 内部测试 | 0% 公网 / 内部 QA | 1 天 | 8h | Dev Lead |
| **Phase 2** 1% 灰度 | 1% 公网流量 | 2 天 | 24h × 2 | Dev Lead + PM |
| **Phase 3** 10% 灰度 | 10% 公网流量 | 3 天 | 24h × 3 | PM |
| **Phase 4** 50% 灰度 | 50% 公网流量 | 2 天 | 24h × 2 | PM |
| **Phase 5** 全量 | 100% | — | 持续 | PM |

---

## 成功标准 (每阶段必须全部满足)

| 指标 | 阈值 |
|---|---|
| 5xx 错误率 | < 0.1% |
| WebSocket 断开率 | < 5% |
| 房间创建成功率 | > 99% |
| reconnect 成功率 | > 80% |
| P99 事件延迟 | < 500ms |
| 灰度组 vs 对照组错误率 | 无明显差异 (< 2x) |

---

## 失败标准 (触发回滚)

| 指标 | 阈值 |
|---|---|
| 5xx 错误率 | > 1% 持续 5 分钟 |
| WebSocket 断开率 | > 10% |
| reconnect 成功率 | < 50% |
| 人工判定 | 不可接受 |

---

## 监控指标 (Grafana)

| 面板 | 关注点 |
|---|---|
| Active Rooms | 无异常下降 |
| WS Connections | 无异常波动 |
| Message Rate | 正常范围 |
| Errors per 5min | 灰度组不应显著高于对照组 |
| Reconnects | success/total 比例正常 |
| Event Latency | P99 < 500ms |

---

## 人工验收步骤

| 步骤 | 操作 | ✅ |
|---|---|---|
| 1 | 打开 `https://<host>/screen` | ⬜ |
| 2 | 确认 room 创建并显示 QR Code | ⬜ |
| 3 | 手机扫码 → controller 加入 | ⬜ |
| 4 | 操作 game → 分数更新 | ⬜ |
| 5 | 刷新 controller → reconnect 成功 | ⬜ |
| 6 | Admin 页面确认 room 可见 | ⬜ |
| 7 | Grafana 确认指标正常 | ⬜ |

---

## 回滚条件

- 任一级别阈值触发 → 执行 ROLLBACK.md
- PM 或 Dev Lead 判定 → 执行 ROLLBACK.md
- 灰度完毕 → 执行 Roll Forward 切全量
