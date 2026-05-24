#!/bin/sh
# validate-webgl-build-output.sh — PartyGameSDK Governance Hook
# Checks that a Unity WebGL build has all required artifacts.
# Usage: ./validate-webgl-build-output.sh <game-name>
# Exits 0 when all checks pass, 1 on failures.
#
# Adapted from: Claude-Code-Game-Studios validate-assets hook

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GAME_NAME="${1:-}"

if [ -z "$GAME_NAME" ]; then
  echo "Usage: $0 <game-name>"
  echo "  game-name: JumpJump | Snake | 2048 | Breakout | <new-game>"
  exit 1
fi

BUILD_DIR="$PROJECT_ROOT/screen/Build_${GAME_NAME}"
VIOLATIONS=0

echo "=== WebGL Build Validation: $GAME_NAME ==="
echo "  Build directory: $BUILD_DIR"

# -----------------------------------------------------------
# 1. Directory exists
# -----------------------------------------------------------
echo -n "  [01] Build directory exists: "
if [ -d "$BUILD_DIR" ]; then
  echo "✅"
else
  echo "❌ MISSING"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# -----------------------------------------------------------
# 2-5. Core build artifacts
# -----------------------------------------------------------
check_file() {
  local num="$1"
  local label="$2"
  local pattern="$3"
  echo -n "  [$num] $label: "
  if find "$BUILD_DIR" -maxdepth 4 -name "$pattern" 2>/dev/null | grep -q .; then
    echo "✅"
  else
    echo "❌ MISSING"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

check_file "02" "loader.js"    "*loader.js"
check_file "03" "framework.js" "*framework.js"
check_file "04" "data"         "*.data"
check_file "05" "wasm"         "*.wasm"

# -----------------------------------------------------------
# 6. index.html
# -----------------------------------------------------------
echo -n "  [06] index.html: "
if [ -f "$BUILD_DIR/index.html" ]; then
  echo "✅"
else
  echo "❌ MISSING"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# -----------------------------------------------------------
# 7. partygame-template.js
# -----------------------------------------------------------
echo -n "  [07] partygame-template.js: "
if [ -f "$BUILD_DIR/partygame-template.js" ]; then
  echo "✅"
else
  echo "❌ MISSING"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# -----------------------------------------------------------
# 8. index.html references
# -----------------------------------------------------------
echo -n "  [08] index.html references partygame-template.js: "
if grep -q 'partygame-template.js' "$BUILD_DIR/index.html" 2>/dev/null; then
  echo "✅"
else
  echo "❌ MISSING reference"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# -----------------------------------------------------------
# 9. index.html references loader
# -----------------------------------------------------------
echo -n "  [09] index.html references loader.js: "
if grep -qE 'loader\.js|Build_.*\.loader\.js' "$BUILD_DIR/index.html" 2>/dev/null; then
  echo "✅"
else
  echo "❌ MISSING reference"
  VIOLATIONS=$((VIOLATIONS + 1))
fi

# -----------------------------------------------------------
# 10-14. File size checks
# -----------------------------------------------------------
echo -n "  [10] loader.js > 1KB: "
LOADER=$(find "$BUILD_DIR" -maxdepth 4 -name "*loader.js" 2>/dev/null | head -1)
if [ -n "$LOADER" ] && [ -f "$LOADER" ]; then
  SIZE=$(wc -c < "$LOADER" | tr -d ' ')
  if [ "$SIZE" -gt 1024 ]; then echo "✅ ($SIZE bytes)"; else echo "❌ too small ($SIZE)"; VIOLATIONS=$((VIOLATIONS + 1)); fi
else
  echo "❌ file not found"; VIOLATIONS=$((VIOLATIONS + 1))
fi

echo -n "  [11] framework.js > 100KB: "
FW=$(find "$BUILD_DIR" -maxdepth 4 -name "*framework.js" 2>/dev/null | head -1)
if [ -n "$FW" ] && [ -f "$FW" ]; then
  SIZE=$(wc -c < "$FW" | tr -d ' ')
  if [ "$SIZE" -gt 102400 ]; then echo "✅ ($SIZE bytes)"; else echo "❌ too small ($SIZE)"; VIOLATIONS=$((VIOLATIONS + 1)); fi
else
  echo "❌ file not found"; VIOLATIONS=$((VIOLATIONS + 1))
fi

echo -n "  [12] data > 1MB: "
DATA=$(find "$BUILD_DIR" -maxdepth 4 -name "*.data" 2>/dev/null | head -1)
if [ -n "$DATA" ] && [ -f "$DATA" ]; then
  SIZE=$(wc -c < "$DATA" | tr -d ' ')
  if [ "$SIZE" -gt 1048576 ]; then echo "✅ ($SIZE bytes)"; else echo "❌ too small ($SIZE)"; VIOLATIONS=$((VIOLATIONS + 1)); fi
else
  echo "❌ file not found"; VIOLATIONS=$((VIOLATIONS + 1))
fi

echo -n "  [13] wasm > 5MB: "
WASM=$(find "$BUILD_DIR" -maxdepth 4 -name "*.wasm" 2>/dev/null | head -1)
if [ -n "$WASM" ] && [ -f "$WASM" ]; then
  SIZE=$(wc -c < "$WASM" | tr -d ' ')
  if [ "$SIZE" -gt 5242880 ]; then echo "✅ ($SIZE bytes)"; else echo "❌ too small ($SIZE)"; VIOLATIONS=$((VIOLATIONS + 1)); fi
else
  echo "❌ file not found"; VIOLATIONS=$((VIOLATIONS + 1))
fi

echo -n "  [14] index.html < 50KB: "
SIZE=$(wc -c < "$BUILD_DIR/index.html" | tr -d ' ')
if [ "$SIZE" -lt 51200 ]; then echo "✅ ($SIZE bytes)"; else echo "⚠️  large ($SIZE bytes)"; fi

# -----------------------------------------------------------
# 15. No empty directories
# -----------------------------------------------------------
echo -n "  [15] No empty sub-directories: "
EMPTY=$(find "$BUILD_DIR" -type d -empty 2>/dev/null | wc -l | tr -d ' ')
if [ "$EMPTY" -eq 0 ]; then
  echo "✅"
else
  echo "⚠️  $EMPTY empty directories found"
fi

# -----------------------------------------------------------
# 16-22. Content validation (best-effort)
# -----------------------------------------------------------
echo -n "  [16] loader.js is valid JS (non-empty): "
head -c 100 "$LOADER" 2>/dev/null | grep -q . && echo "✅" || { echo "❌"; VIOLATIONS=$((VIOLATIONS + 1)); }

echo -n "  [17] wasm is binary (non-text): "
if file "$WASM" 2>/dev/null | grep -q 'WebAssembly'; then echo "✅"; else echo "⚠️  could not verify format"; fi

echo -n "  [18] index.html has <html> tag: "
grep -q '<html' "$BUILD_DIR/index.html" 2>/dev/null && echo "✅" || { echo "❌"; VIOLATIONS=$((VIOLATIONS + 1)); }

echo -n "  [19] index.html has <canvas>: "
grep -q '<canvas' "$BUILD_DIR/index.html" 2>/dev/null && echo "✅" || echo "⚠️  no canvas (may be in template)"

echo -n "  [20] index.html has <script> tags: "
grep -q '<script' "$BUILD_DIR/index.html" 2>/dev/null && echo "✅" || { echo "❌"; VIOLATIONS=$((VIOLATIONS + 1)); }

echo -n "  [21] partygame-template.js has PartyGameBridge: "
grep -q 'PartyGameBridge' "$BUILD_DIR/partygame-template.js" 2>/dev/null && echo "✅" || { echo "❌"; VIOLATIONS=$((VIOLATIONS + 1)); }

echo -n "  [22] No .DS_Store or Thumbs.db: "
JUNK=$(find "$BUILD_DIR" -name '.DS_Store' -o -name 'Thumbs.db' 2>/dev/null | wc -l | tr -d ' ')
if [ "$JUNK" -eq 0 ]; then echo "✅"; else echo "⚠️  $JUNK junk files"; fi

echo ""
if [ $VIOLATIONS -eq 0 ]; then
  echo "=== ALL 22 CHECKS PASS ==="
  exit 0
else
  echo "=== $VIOLATIONS VIOLATION(S) FOUND ==="
  exit 1
fi
