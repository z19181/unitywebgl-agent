# Manual Device QA Checklist — PartyGameSDK v0.4.2

> **版本:** v0.4.2 (tag: `v0.4.2`, commit: `e065ece`)
> **自动测试状态:** 53/53 PASS ✅
> **目标:** 完成 17 项人工真机验证，确认移动端兼容性后进入 1% 灰度

---

## 测试环境

| 项目 | 值 |
|---|---|
| **测试 URL** | `https://<部署域名>/screen` (WSS 环境) |
| **本地测试 URL** | `http://<本机IP>:3000/screen` (WS 环境，仅局域网) |
| **Admin URL** | `https://<部署域名>/admin` |
| **Grafana URL** | `http://localhost:3000` (内部) |
| **Admin Token** | 部署时配置的 `ADMIN_TOKEN` |

## 测试账号 / 权限说明

| 账号/角色 | 说明 |
|---|---|
| **Screen 端** | 无需登录，浏览器打开 `/screen` 即可创建房间 |
| **Controller 端** | 无需登录，扫码或输入链接加入 |
| **Admin** | 需要 `ADMIN_TOKEN`，Bearer Auth |
| **Grafana** | 默认 `admin/admin`（生产环境需修改） |

## 测试前准备

- [ ] 确认 v0.4.2 已部署到可公网/局域网访问的 HTTPS 环境
- [ ] 确认 WSS 证书有效（非自签名，移动端不信任自签名证书）
- [ ] 准备至少 2 台测试设备（iOS + Android）
- [ ] 安装微信（用于 WebView 测试）
- [ ] 准备 1 台 Desktop 用于打开 Screen 端
- [ ] 确认 Admin Dashboard 可访问
- [ ] 确认 Grafana 可访问

---

# iOS Safari 测试清单

**设备要求:** iOS 16+, Safari 浏览器
**优先级:** 🔴 高 (5 项) + 🟡 中 (2 项)

| # | 测试项 | 优先级 | 操作步骤 | Pass/Fail |
|---|---|---|---|---|
| I1 | Safe Area 渲染 | 🔴 高 | 打开 `/controller`，确认内容不被刘海屏/底部横条遮挡。检查顶部导航栏和底部按钮是否在安全区域内 | ⬜ |
| I2 | WSS 连接 | 🔴 高 | 在 HTTPS 环境下打开 `/controller`，确认 WebSocket 连接成功（Console 无 ws:// blocked 错误） | ⬜ |
| I3 | 横竖屏切换 | 🔴 高 | 竖屏打开 → 旋转横屏 → 旋转回竖屏。每步确认布局自动适配，按钮/面板位置正确，无溢出或空白。刷新后也验证 | ⬜ |
| I4 | QR 扫码加入 | 🔴 高 | Desktop 打开 `/screen` 创建房间 → iOS Safari 打开 `/controller` → 扫码加入。确认加入成功，playerIndex 显示正确 | ⬜ |
| I5 | 触摸按钮区域 | 🟡 中 | 点击关闭按钮、复制按钮等，确认轻松点中（44px+ 触控区）。尝试手指偏移点击，确认宽容度 | ⬜ |
| I6 | AudioContext 恢复 | 🟡 中 | 打开 `/controller` → 首次触摸屏幕 → 确认 Console 无 AudioContext suspended 警告。触发游戏音效确认有声音 | ⬜ |
| I7 | Game 操作完整流程 | 🔴 高 | 扫码加入 → 操作游戏（tap/move 等） → 确认分数更新 → 确认 screen 端实时显示 → 刷新页面 → reconnect 成功 | ⬜ |

---

# iOS 微信 WebView 测试清单

**设备要求:** iOS 16+, 微信内置浏览器
**优先级:** 🔴 高 (3 项) + 🟡 中 (1 项)

| # | 测试项 | 优先级 | 操作步骤 | Pass/Fail |
|---|---|---|---|---|
| W1 | Safe Area 渲染 | 🔴 高 | 在微信中打开 `/controller`，确认安全区适配正常，内容不被遮挡 | ⬜ |
| W2 | WSS 连接 | 🔴 高 | HTTPS 环境 → 微信内打开 → 确认 WebSocket 连接成功 | ⬜ |
| W3 | QR 长按识别 | 🟡 中 | Desktop screen 显示 QR 码 → 微信内长按 QR 图片 → 选择"识别图中二维码" → 确认能识别并跳转 | ⬜ |
| W4 | Game 操作 | 🔴 高 | 加入房间 → 操作游戏 → 确认 input 正常发送 / score_update 正常接收 / room_closed 正常接收 | ⬜ |

---

# Android Chrome 测试清单

**设备要求:** Android 12+, Chrome 浏览器
**优先级:** 🔴 高 (4 项) + 🟡 中 (1 项)

| # | 测试项 | 优先级 | 操作步骤 | Pass/Fail |
|---|---|---|---|---|
| A1 | Safe Area 渲染 | 🔴 高 | 使用挖孔屏/水滴屏设备，打开 `/controller`，确认内容在安全区域内。系统导航栏不影响底部按钮 | ⬜ |
| A2 | WSS 连接 | 🔴 高 | HTTPS 环境下确认 WebSocket 连接成功，Console 无 Mixed Content 错误 | ⬜ |
| A3 | 横竖屏切换 | 🔴 高 | 竖屏→横屏→竖屏，确认布局无错乱。横屏模式按钮不溢出、不重叠 | ⬜ |
| A4 | QR 扫码加入 | 🔴 高 | 使用 Chrome 内置扫码功能或第三方扫码工具，确认跳转正常 | ⬜ |
| A5 | 触摸按钮区域 | 🟡 中 | 确认 44px+ 触控区域，小屏设备也能准确点击。快速连续点击不触发缩放 | ⬜ |

---

# Android 微信 WebView 测试清单

**设备要求:** Android 12+, 微信内置浏览器
**优先级:** 🔴 高 (3 项) + 🟡 中 (1 项)

| # | 测试项 | 优先级 | 操作步骤 | Pass/Fail |
|---|---|---|---|---|
| X1 | Safe Area 渲染 | 🔴 高 | 微信内打开 `/controller`，确认状态栏/导航栏区域适配正常 | ⬜ |
| X2 | WSS 连接 | 🔴 高 | HTTPS 环境 → 微信内打开 → 确认 WebSocket 连接成功。注意 Android 微信 WebView 内核差异 | ⬜ |
| X3 | QR 长按识别 | 🟡 中 | 长按 QR 图片 → 识别图中二维码 → 确认正确跳转 | ⬜ |
| X4 | Game 操作 | 🔴 高 | 加入 → 操作 → 分数更新 → room_closed 接收。注意微信 WebView 可能禁用部分 JS API | ⬜ |

---

# 只读检查清单（Desktop / 任意设备）

| # | 检查项 | 操作 | Pass/Fail |
|---|---|---|---|
| O1 | Health Endpoint | `curl https://<域名>/__health` → 确认 version=v0.4.2, status=ok | ⬜ |
| O2 | Metrics Endpoint | `curl https://<域名>/__metrics` → 确认返回 Prometheus 格式，包含 partygame_ 指标 | ⬜ |
| O3 | Admin Dashboard | 浏览器打开 `/admin` → 输入 Token → 确认房间列表/指标卡片正常显示 | ⬜ |
| O4 | Admin Health | `curl https://<域名>/admin/health` → 确认 ok:true, version=v0.4.2 | ⬜ |
| O5 | Grafana | `http://localhost:3000` → Dashboards → PartyGameSDK Overview → 确认 12 面板正常渲染 | ⬜ |
| O6 | Reconnect | Controller 刷新页面 → 10s 内自动重连成功 → playerIndex 不变 | ⬜ |
| O7 | Room Close | Admin close room → Controller 收到 room_closed → 显示"房间已关闭" | ⬜ |

---

## 失败记录模板

当任意测试项 FAIL 时，请记录以下信息：

```
测试项 ID: [I1/W1/A1/X1/O1 etc.]
设备型号: [iPhone 15 Pro / Galaxy S24 / etc.]
系统版本: [iOS 17.4 / Android 14 / etc.]
浏览器版本: [Safari 17.4 / Chrome 124 / WeChat 8.0.49]
问题描述: [具体现象]
截图: [附截图]
Console 日志: [附 Console 输出]
复现步骤:
  1. ...
  2. ...
  3. ...
预期行为: ...
实际行为: ...
```

---

## 测试汇总

| 平台 | 浏览器 | 总测试项 | Pass | Fail |
|---|---|---|---|---|
| iOS | Safari | 7 | ___ | ___ |
| iOS | 微信 WebView | 4 | ___ | ___ |
| Android | Chrome | 5 | ___ | ___ |
| Android | 微信 WebView | 4 | ___ | ___ |
| Desktop/Any | 只读检查 | 7 | ___ | ___ |
| **总计** | | **27** | ___ | ___ |

---

## 通过标准

- **全部 27 项 PASS** → 批准进入 Phase 2 (1% 灰度)
- **0 项 HIGH 失败** → 可进入 Phase 2（中/低优先级的 FAIL 需记录为 Known Issue）
- **任何 🔴 HIGH 失败** → 阻塞，需要 bugfix，不得进入 Phase 2
