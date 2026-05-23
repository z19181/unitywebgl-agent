#!/bin/bash
# build-jumpjump-webgl.sh — PartyGameSDK v0.4.2
# Unity 6 WebGL batchmode build for JumpJumpTemplateDemo
# Output: screen/Build/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
UNITY_PROJECT="$PROJECT_ROOT/UnityExamples/JumpJumpTemplateDemo"
LOG_DIR="$PROJECT_ROOT/logs/codex"
BUILD_LOG="$LOG_DIR/build-$(date +%Y%m%d-%H%M%S).log"

# Ensure log dir
mkdir -p "$LOG_DIR"

echo "╔══════════════════════════════════════════╗"
echo "║  PartyGameSDK WebGL Build                ║"
echo "║  Project: JumpJumpTemplateDemo           ║"
echo "║  Output:  screen/Build                   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Detect Unity 6 ──
UNITY=""
for candidate in \
  /Applications/Unity/Hub/Editor/6000.*/Unity.app/Contents/MacOS/Unity \
  /Applications/Unity/Hub/Editor/6*/Unity.app/Contents/MacOS/Unity \
  /Applications/Unity/Unity.app/Contents/MacOS/Unity; do
  for match in $candidate; do
    if [ -x "$match" ]; then
      UNITY="$match"
      break 2
    fi
  done
done

if [ -z "$UNITY" ]; then
  echo "❌ Unity 6 not found."
  echo "   Check: ls /Applications/Unity/Hub/Editor/"
  echo "   Install Unity 6 with WebGL Build Support via Unity Hub."
  exit 1
fi

# ── Detect Python for Emscripten ──
PYTHON_BIN="python3"
if command -v python3.11 &>/dev/null; then
  PYTHON_BIN="python3.11"
fi

echo "Unity:     $UNITY"
UNITY_VERSION=$("$UNITY" -version 2>/dev/null || echo "unknown")
echo "Version:   $UNITY_VERSION"
echo "Python:    $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"
echo "Project:   $UNITY_PROJECT"
echo "Log:       $BUILD_LOG"
echo ""

# ── Verify project exists ──
if [ ! -d "$UNITY_PROJECT/Assets" ]; then
  echo "❌ Unity project not found at $UNITY_PROJECT"
  exit 1
fi

# ── Build ──
echo "→ Starting Unity batchmode build..."
EMSDK_PYTHON="$PYTHON_BIN" \
"$UNITY" \
  -quit -batchmode -nographics \
  -acceptSoftwareTermsForThisRunOnly \
  -projectPath "$UNITY_PROJECT" \
  -executeMethod JumpJumpWebGLBuilder.BuildWebGL \
  -logFile "$BUILD_LOG"

BUILD_EXIT=$?

echo ""
if [ $BUILD_EXIT -eq 0 ]; then
  echo "╔══════════════════════════════════════════╗"
  echo "║  ✅ BUILD SUCCEEDED                      ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "Output: $PROJECT_ROOT/screen/Build/"
  ls -lh "$PROJECT_ROOT/screen/Build/" 2>/dev/null || echo "(Build dir not found — check $BUILD_LOG)"
  echo ""
  echo "Next: PORT=3000 node server/server.js"
  echo "      open http://localhost:3000/screen/"
else
  echo "╔══════════════════════════════════════════╗"
  echo "║  ❌ BUILD FAILED (exit $BUILD_EXIT)        ║"
  echo "╚══════════════════════════════════════════╝"
  echo ""
  echo "Check log: $BUILD_LOG"
fi

exit $BUILD_EXIT
