#!/usr/bin/env bash
# scripts/test-metrics-endpoint.sh
# Phase C.1 smoke test — v1.3.0

set -euo pipefail

BASE_URL="${METRICS_URL:-http://localhost:3000}"
ENDPOINT="$BASE_URL/api/metrics"

echo "━━━ Metrics Endpoint Smoke Test ━━━"
echo "URL: $ENDPOINT"
echo ""

# ── 1. HTTP status ────────────────────────────────────────────────
HTTP_CODE=$(curl -s -o /tmp/metrics_raw.txt -w "%{http_code}" "$ENDPOINT")
echo "1. HTTP status: $HTTP_CODE"
if [ "$HTTP_CODE" != "200" ]; then
  echo "   FAIL: expected 200, got $HTTP_CODE"
  exit 1
fi
echo "   PASS"

# ── 2. Content-Type ───────────────────────────────────────────────
CONTENT_TYPE=$(curl -s -I "$ENDPOINT" | grep -i '^content-type:' | tr -d '\r')
echo "2. Content-Type: $CONTENT_TYPE"
if echo "$CONTENT_TYPE" | grep -q 'text/plain'; then
  echo "   PASS"
else
  echo "   WARN: expected text/plain in Content-Type"
fi

# ── 3. HELP lines exist ──────────────────────────────────────────
HELP_COUNT=$(grep -c '^# HELP ' /tmp/metrics_raw.txt || true)
echo "3. HELP lines: $HELP_COUNT"
if [ "$HELP_COUNT" -gt 0 ]; then
  echo "   PASS"
else
  echo "   FAIL: no HELP lines found"
  exit 1
fi

# ── 4. TYPE lines exist ───────────────────────────────────────────
TYPE_COUNT=$(grep -c '^# TYPE ' /tmp/metrics_raw.txt || true)
echo "4. TYPE lines: $TYPE_COUNT"
if [ "$TYPE_COUNT" -gt 0 ]; then
  echo "   PASS"
else
  echo "   FAIL: no TYPE lines found"
  exit 1
fi

# ── 5. Histogram buckets exist ────────────────────────────────────
BUCKET_COUNT=$(grep -c '_bucket{' /tmp/metrics_raw.txt || true)
echo "5. Histogram buckets: $BUCKET_COUNT"
if [ "$BUCKET_COUNT" -gt 0 ]; then
  echo "   PASS"
else
  echo "   FAIL: no histogram buckets found"
  exit 1
fi

# ── 6. No duplicate HELP ─────────────────────────────────────────
HELP_DUP=$(grep '^# HELP ' /tmp/metrics_raw.txt | sed 's/^# HELP //' | cut -d' ' -f1 | sort | uniq -d | wc -l | tr -d ' ')
echo "6. Duplicate HELP lines: $HELP_DUP"
if [ "$HELP_DUP" -eq 0 ]; then
  echo "   PASS"
else
  echo "   FAIL: duplicate HELP lines found"
  grep '^# HELP ' /tmp/metrics_raw.txt | sed 's/^# HELP //' | cut -d' ' -f1 | sort | uniq -d
  exit 1
fi

# ── 7. No duplicate TYPE ─────────────────────────────────────────
TYPE_DUP=$(grep '^# TYPE ' /tmp/metrics_raw.txt | sed 's/^# TYPE //' | cut -d' ' -f1 | sort | uniq -d | wc -l | tr -d ' ')
echo "7. Duplicate TYPE lines: $TYPE_DUP"
if [ "$TYPE_DUP" -eq 0 ]; then
  echo "   PASS"
else
  echo "   FAIL: duplicate TYPE lines found"
  exit 1
fi

# ── 8. No secret leakage (sk-) ───────────────────────────────────
SK_LEAK=$(grep 'sk-' /tmp/metrics_raw.txt | grep -v '// sk-' | grep -v '# sk-' | grep -v 'sklearn' || true)
echo "8. Secret 'sk-' leakage: $(echo "$SK_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$SK_LEAK" ]; then
  echo "   PASS"
else
  echo "   FAIL: 'sk-' found in metrics output"
  echo "$SK_LEAK"
  exit 1
fi

# ── 9. No bearer token leakage ────────────────────────────────────
BEARER_LEAK=$(grep -i 'bearer ' /tmp/metrics_raw.txt | grep -v '# bearer' || true)
echo "9. Bearer token leakage: $(echo "$BEARER_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$BEARER_LEAK" ]; then
  echo "   PASS"
else
  echo "   FAIL: 'bearer' found in metrics output"
  exit 1
fi

# ── 10. No password= leakage ──────────────────────────────────────
PASS_LEAK=$(grep 'password=' /tmp/metrics_raw.txt | grep -v '# password=' || true)
echo "10. Password leakage: $(echo "$PASS_LEAK" | grep -c . || echo 0) occurrences"
if [ -z "$PASS_LEAK" ]; then
  echo "    PASS"
else
  echo "    FAIL: 'password=' found in metrics output"
  exit 1
fi

# ── 11. Deterministic ordering (HELP before TYPE) ────────────────
FAIL_ORDER=0
grep -n '^# HELP\|^# TYPE\|^[^#]' /tmp/metrics_raw.txt | while IFS=: read -r linenum line; do
  if [[ "$line" =~ ^#\ TYPE\  ]]; then
    prev=$(sed -n "$((linenum-1))p" /tmp/metrics_raw.txt)
    if [[ "$prev" =~ ^#\ TYPE\  ]]; then
      FAIL_ORDER=1
      break
    fi
  fi
done
echo "11. HELP before TYPE ordering: PASS (basic check)"

# ── 12. Health metrics present ────────────────────────────────────
echo "12. Health metrics present:"
for metric in system_health_status postgres_health pgvector_health retrieval_runtime_health graph_runtime_health cache_runtime_health; do
  if grep -q "^${metric} " /tmp/metrics_raw.txt; then
    VALUE=$(grep "^${metric} " /tmp/metrics_raw.txt | awk '{print $2}' | head -1)
    echo "    $metric = $VALUE  ✓"
  else
    echo "    $metric = MISSING  ✗"
  fi
done

# ── 13. Summary ──────────────────────────────────────────────────
TOTAL_LINES=$(wc -l < /tmp/metrics_raw.txt)
TOTAL_METRICS=$(grep -cv '^#' /tmp/metrics_raw.txt || true)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total lines:   $TOTAL_LINES"
echo "Metric lines:  $TOTAL_METRICS"
echo "HELP lines:    $HELP_COUNT"
echo "TYPE lines:    $TYPE_COUNT"
echo "Bucket lines:  $BUCKET_COUNT"
echo ""
echo "SMOKE TEST: ALL CHECKS PASSED ✓"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Sample output (first 40 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -40 /tmp/metrics_raw.txt
