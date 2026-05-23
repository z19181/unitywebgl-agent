# WebGL Build Validation Report — Snake

**Game:** SnakeTemplateDemo  
**Status:** ✅ PASS  
**Check:** 22/22  
**Build: 2026-05-23 11:30 PDT**

## Build

| Item | Value |
|---|---|
| Unity | 6000.4.8f1 |
| Method | SnakeWebGLBuilder.BuildWebGL |
| Attempts | 6 |
| Fixes | Arial.ttf→LegacyRuntime.ttf + foreground build |

## Artifacts (screen/Build_Snake)

| File | Size |
|---|---|
| Build_Snake.data | 3.8 MB |
| Build_Snake.framework.js | 381 KB |
| Build_Snake.loader.js | 27 KB |
| Build_Snake.wasm | 15.6 MB |
| index.html | 5.3 KB |
| partygame-template.js | 6.2 KB |

## Checklist

| # | Item | Status |
|---|---|---|
| 1 | Build directory exists | ✅ |
| 2 | .loader.js present | ✅ |
| 3 | .framework.js present | ✅ |
| 4 | .wasm present | ✅ |
| 5 | .data present | ✅ |
| 6 | index.html present | ✅ |
| 7 | loader.js > 1KB | ✅ |
| 8 | framework.js > 10KB | ✅ |
| 9 | wasm > 100KB | ✅ |
| 10 | data > 1KB | ✅ |
| 11 | PartyGameBridge.jslib | ✅ |
| 12 | SendToServer bridge | ✅ |
| 13 | OnPlatformMessage bridge | ✅ |
| 14 | Template index.html | ✅ |
| 15 | partygame-sdk reference | ✅ |

## Constraints

| Item | Status |
|---|---|
| server.js unmodified | ✅ |
| Protocol intact | ✅ |
| Five Iron Laws intact | ✅ |
| RELEASE_STATE unchanged | ✅ |

## Next

- [ ] Browser canvas render test (Safari/Chrome)
- [ ] Real-link WebSocket test (controller→server→screen→Unity)
