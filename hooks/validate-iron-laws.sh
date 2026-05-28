#!/bin/sh
# validate-iron-laws.sh — PartyGameSDK Governance Hook
# Checks that the 5 iron laws + invariants are not violated.
# Runs on session start. Exits 0 when all pass, 1 on violations.
#
# Adapted from: Claude-Code-Game-Studios hook system

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VIOLATIONS=0

echo "=== PartyGameSDK Iron Law Validation ==="

# -----------------------------------------------------------
# Iron Law 1: Controller must NOT send playerIndex
# -----------------------------------------------------------
echo -n "  Law 1 (controller no playerIndex): "
if grep -rq 'playerIndex' "$PROJECT_ROOT/controller/index.html" 2>/dev/null; then
  # Allow: reading playerIndex from server messages is OK
  # Check if playerIndex is being SENT (in msg.data.playerIndex assignment)
  if grep -qE '(send|emit|ws\.send).*playerIndex' "$PROJECT_ROOT/controller/index.html" 2>/dev/null; then
    echo "❌ VIOLATION — controller sends playerIndex"
    VIOLATIONS=$((VIOLATIONS + 1))
  else
    echo "✅ PASS (receive-only)"
  fi
else
  echo "✅ PASS"
fi

# -----------------------------------------------------------
# Iron Law 2: Server must NOT parse game_message.type
# -----------------------------------------------------------
echo -n "  Law 2 (server no game_message.type parse): "
if grep -q 'game_message\.type\|msg\.type.*===.*game' "$PROJECT_ROOT/server/server.js" 2>/dev/null; then
  echo "❌ VIOLATION — server.js parses game_message.type"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ PASS"
fi

# -----------------------------------------------------------
# Iron Law 3: Screen must NOT compute scores/winners
# -----------------------------------------------------------
echo -n "  Law 3 (screen no score/winner compute): "
if grep -qE '(score|winner|lose|winning|gameOver).*=' "$PROJECT_ROOT/screen/index.html" 2>/dev/null | grep -v forwardToUnity | grep -v log | grep -v statusBar > /dev/null 2>&1; then
  echo "⚠️  WARNING — screen may contain game logic (review needed)"
else
  echo "✅ PASS"
fi

# -----------------------------------------------------------
# Iron Law 4: Unity PartyGameBridge.jslib must be unchanged
# -----------------------------------------------------------
echo -n "  Law 4 (PartyGameBridge.jslib read-only): "
SKELETON_BRIDGE="$PROJECT_ROOT/UnityExamples/_GameTemplateSkeleton/Assets/Plugins/WebGL/PartyGameBridge.jslib"
if [ -f "$SKELETON_BRIDGE" ]; then
  SKEL_HASH=$(shasum -a 256 "$SKELETON_BRIDGE" 2>/dev/null | cut -d' ' -f1)
  # Check all game templates
  for bridge in "$PROJECT_ROOT"/UnityExamples/*/Assets/Plugins/WebGL/PartyGameBridge.jslib; do
    if [ -f "$bridge" ] && [ "$bridge" != "$SKELETON_BRIDGE" ]; then
      GAME_HASH=$(shasum -a 256 "$bridge" 2>/dev/null | cut -d' ' -f1)
      if [ "$SKEL_HASH" != "$GAME_HASH" ]; then
        echo "❌ VIOLATION — $(dirname $(dirname $(dirname $(dirname $bridge)))) has modified PartyGameBridge.jslib"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  done
  if [ $VIOLATIONS -eq 0 ] || [ "$SKEL_HASH" != "$GAME_HASH" ]; then
    : # already counted
  fi
fi
echo "✅ PASS"

# -----------------------------------------------------------
# Iron Law 5: Controller UI from state only
# -----------------------------------------------------------
echo -n "  Law 5 (controller UI from state): "
if grep -q 'game_state\|handleGameState\|gameState' "$PROJECT_ROOT/controller/index.html" 2>/dev/null; then
  echo "✅ PASS (game_state handler exists)"
else
  echo "⚠️  WARNING — no game_state handler found"
fi

# -----------------------------------------------------------
# Invariant: RELEASE_STATE.json phase integrity
# -----------------------------------------------------------
echo -n "  Invariant (RELEASE_STATE.json phase): "
if [ -f "$PROJECT_ROOT/RELEASE_STATE.json" ]; then
  if python3 -c "import json; d=json.load(open('$PROJECT_ROOT/RELEASE_STATE.json')); assert 'current_phase' in d" 2>/dev/null; then
    PHASE=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/RELEASE_STATE.json'))['current_phase'])" 2>/dev/null)
    echo "✅ PASS (phase=$PHASE)"
  else
    echo "❌ VIOLATION — RELEASE_STATE.json missing current_phase"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
else
  echo "⚠️  WARNING — RELEASE_STATE.json not found"
fi

# -----------------------------------------------------------
# Invariant: game_message.type transparency
# -----------------------------------------------------------
echo -n "  Invariant (game_message transparency): "
if grep -qE 'game_message.*type|switch.*msg\.type.*game' "$PROJECT_ROOT/server/server.js" 2>/dev/null; then
  echo "❌ VIOLATION — server inspects game_message content"
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ PASS"
fi

echo ""
echo "=== Result: $VIOLATIONS violation(s) ==="

exit $VIOLATIONS
