# Unity 6000 Build Pipeline Solidification

## Objective
Document and solidify the Unity 6000 + Node.js v22 Emscripten build experience for all future Codex/QClaw collaboration.

## Key Fix
EMSDK_PYTHON=/Users/applemima1111/.local/bin/python3.11
Resolves JSONDecodeError in Unity 6000.4.8f1 Emscripten WebGL postprocessor.

## Files Updated
| File | Change |
|---|---|
| UNITY_WEBGL_REAL_BUILD_FINAL_REPORT.md | NEW — root cause analysis, fix, 6-attempt history |
| CODEX_TASKS.md | EMSDK_PYTHON env var now in build command |
| CODEX_QCLAW_HANDOFF.md | Troubleshooting section — check EMSDK_PYTHON first |
| PARTY_GAME_SDK_FINAL_HANDOFF.md | Validated Pipeline Gate table + artifact inventory |

## Build Gate
PASS — 6/6 gates verified, 22/22 check script, 5/5 iron laws.
Commit: 61aa74d
