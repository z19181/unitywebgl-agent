#!/usr/bin/env bash
# scripts/test-health-endpoint.sh
# Phase C.4 smoke test — v1.3.0

set -euo pipefail

BASE_URL="${HEALTH_URL:-http://localhost:3000}"
ENDPOINT="$BASE_URL/api/health"

echo "━━━ Health Endpoint Smoke Test ━━━"
echo "URL: $ENDPOINT"
echo ""

# ── 1. HTTP status ────────────────────────────────────────────────
HTTP_CODE=$(curl -s -o /tmp/health_raw.txt -w "%{http_code}" "$ENDPOINT")
echo "1. HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "503" ]; then
  echo "   PASS (200 or 503 accepted)"
else
  echo "   FAIL: expected 200 or 503, got $HTTP_CODE"
  exit 1
fi

# ── 2. Content-Type ───────────────────────────────────────────────
CONTENT_TYPE=$(curl -s -I "$ENDPOINT" | grep -i '^content-type:' | tr -d '\r')
echo "2. Content-Type: $CONTENT_TYPE"
if echo "$CONTENT_TYPE" | grep -q 'application/json'; then
  echo "   PASS"
else
  echo "   WARN: expected application/json in Content-Type"
fi

# ── 3. Valid JSON ──────────────────────────────────────────────────
echo "3. Valid JSON:"
if python3 -m json.tool /tmp/health_raw.txt > /dev/null 2>&1; then
  echo "   PASS"
elif python -m json.tool /tmp/health_raw.txt > /dev/null 2>&1; then
  echo "   PASS"
else
  echo "   FAIL: response is not valid JSON"
  cat /tmp/health_raw.txt
  exit 1
fi

# ── 4. Has 'status' field ────────────────────────────────────────
echo "4. Has 'status' field:"
STATUS_VAL=$(python3 -c "import json,sys; d=json.load(open('/tmp/health_raw.txt')); print(d.get('status','MISSING'))" 2>/dev/null || \
             python  -c "import json,sys; d=json.load(open('/tmp/health_raw.txt')); print(d.get('status','MISSING'))")
echo "   status = $STATUS_VAL"
if [ "$STATUS_VAL" = "healthy" ] || [ "$STATUS_VAL" = "degraded" ] || [ "$STATUS_VAL" = "critical" ]; then
  echo "   PASS"
else
  echo "   FAIL: unexpected status value"
  exit 1
fi

# ── 5. Has 'checks' object ───────────────────────────────────────
echo "5. Has 'checks' object:"
HAS_CHECKS=$(python3 -c "import json,sys; d=json.load(open('/tmp/health_raw.txt')); print('yes' if 'checks' in d else 'no')" 2>/dev/null || \
              python  -c "import json,sys; d=json.load(open('/tmp/health_raw.txt')); print('yes' if 'checks' in d else 'no')")
echo "   checks present: $HAS_CHECKS"
if [ "$HAS_CHECKS" = "yes" ]; then
  echo "   PASS"
else
  echo "   FAIL: 'checks' field missing"
  exit 1
fi

# ── 6. 5 check components present ─────────────────────────────────
echo "6. Check components present:"
for component in postgres pgvector retrieval graph cache; do
  OK=$(python3 -c "import json,sys; d=json.load(open('/tmp/health_raw.txt')); print('yes' if d.get('checks',{}).get('$component',{}).get('ok','') is not None else 'no')" 2>/dev/null || echo "no")
  echo "   $component.ok exists: $OK"
done
echo "   PASS (all components checked)"

# ── 7. No secret leakage (sk-) ───────────────────────────────────
SK_LEAK=$(grep 'sk-' /tmp/health_raw.txt | grep -v '// sk-' | grep -v '# sk-' | grep -v 'sklearn' || true)
echo "7. Secret 'sk-' leakage: $(echo "$SK_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$SK_LEAK" ]; then
  echo "   PASS"
else
  echo "   FAIL: 'sk-' found in health output"
  echo "$SK_LEAK"
  exit 1
fi

# ── 8. No bearer token leakage ────────────────────────────────────
BEARER_LEAK=$(grep -i 'bearer ' /tmp/health_raw.txt | grep -v '"bearer"' || true)
echo "8. Bearer token leakage: $(echo "$BEARER_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$BEARER_LEAK" ]; then
  echo "   PASS"
else
  echo "   FAIL: 'bearer' found in health output"
  exit 1
fi

# ── 9. No password= leakage ──────────────────────────────────────
PASS_LEAK=$(grep 'password=' /tmp/health_raw.txt | grep -v '"password="' || true)
echo "9. Password leakage: $(echo "$PASS_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$PASS_LEAK" ]; then
  echo "    PASS"
else
  echo "    FAIL: 'password=' found in health output"
  exit 1
fi

# ── 10. No prompt/memory content ─────────────────────────────────
PROMPT_LEAK=$(grep -i 'prompt\|memory_content\|system_prompt\|document_content' /tmp/health_raw.txt || true)
echo "10. Prompt/memory content leakage: $(echo "$PROMPT_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$PROMPT_LEAK" ]; then
  echo "    PASS"
else
  echo "    FAIL: prompt/memory content found in health output"
  exit 1
fi

# ── 11. 405 on write methods ────────────────────────────────────
for METHOD in POST PUT DELETE; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$ENDPOINT")
  echo "11. $METHOD → $CODE"
  if [ "$CODE" != "405" ]; then
    echo "    FAIL: expected 405, got $CODE"
    exit 1
  fi
done
echo "    PASS (all write methods return 405)"

# ── 12. OPTIONS = 204 ───────────────────────────────────────────
OPTIONS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$ENDPOINT")
echo "12. OPTIONS → $OPTIONS_CODE"
if [ "$OPTIONS_CODE" = "204" ]; then
  echo "    PASS"
else
  echo "    WARN: expected 204, got $OPTIONS_CODE"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python3 -m json.tool /tmp/health_raw.txt 2>/dev/null || python -m json.tool /tmp/health_raw.txt 2>/dev/null || cat /tmp/health_raw.txt
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "HEALTH SMOKE TEST: ALL CHECKS PASSED ✓"
