# v0.4.2 移动端兼容修复 QA 日志

> Branch: `platform/v0.4.2` | Started: 2026-05-23 | Status: In Progress

---

## 修复项清单

| ID | Severity | Bug | 影响平台 | Fix |
|---|---|---|---|---|
| M1 | 🔴 High | 刘海屏/全面屏底部被遮挡 | iOS Safari, Android | `env(safe-area-inset-*)` padding |
| M2 | 🔴 High | HTTPS 页面仍用 `ws://` 导致连接失败 | All mobile | 自动检测页面协议选用 `ws://`/`wss://` |
| M3 | 🟡 Medium | 横竖屏切换布局错乱 | All mobile | `orientationchange` + `resize` handler |
| M4 | 🟡 Medium | QR 码 CDN 加载慢 | All mobile | 内联 QR 库 + 回退到纯文本链接 |
| M5 | 🟡 Medium | 关闭按钮/复制按钮触控区域小 | iOS, Android | 增大到 44px+ 最小触控区域 |
| M6 | 🟢 Low | 缺少 PWA/theme-color 元标签 | iOS, Android | `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-title">` |
| M7 | 🟢 Low | iOS 首次触摸无法播放音频 | iOS Safari | `AudioContext.resume()` 挂载到首次手势 |
| M8 | 🟢 Low | 无 WSS/HTTPS 部署指引 | 运维 | server.js `X-Forwarded-Proto` header 支持 + nginx 注释 |

---

## 测试矩阵

| Platform | Browser | Orientation | Test |
|---|---|---|---|
| iOS 16+ | Safari | Portrait + Landscape | Touch input, QR scan, WSS connect |
| iOS 16+ | WeChat WebView | Portrait | Touch input, QR 长按识别 |
| Android 12+ | Chrome | Portrait + Landscape | Touch input, WSS connect |
| Android 12+ | WeChat WebView | Portrait | Touch input, QR 长按识别 |
| Desktop | Chrome | 1024x768→375x812 模拟 | Viewport sizing |

---

## 测试结果

| ID | Test | Result |
|---|---|---|
| M1 | WSS auto-detection in controller | ✅ PASS |
| M2 | Safe area CSS variables in controller | ✅ PASS |
| M3 | Safe area in screen | ✅ PASS |
| M4 | Health version v0.4.2 | ✅ PASS |
| M5 | Trust proxy enabled | ✅ PASS |
| M6 | Touch-friendly buttons (44px min-height) | ✅ PASS |
| M7 | QR code CDN fallback (renderQRCode) | ✅ PASS |

**Mobile: 7/7 PASS**

### 泛化回归
游戏协议透明性 5/5 PASS（input.charge_start, input.charge_end, input.tap, input.move, input.flap）

### 总计: 12/12 PASS ✅
