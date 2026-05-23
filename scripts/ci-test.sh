#!/bin/bash
# scripts/ci-test.sh — v0.3.0 CI Regression Test
# Usage: ./scripts/ci-test.sh
# Exits 0 if all tests pass, 1 otherwise

set -e

PORT=${1:-3099}
TEST_FILE=/tmp/_ci_test_v030.js

echo "=== PartyGameSDK v0.3.0 CI ==="
echo ""

# 1. Start server
echo "→ Starting server on port $PORT..."
node server/server.js &
SERVER_PID=$!
sleep 2

# 2. Health check
echo "→ Health check..."
HEALTH=$(curl -s http://localhost:$PORT/__health)
echo "  $HEALTH"
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "  ✅ Health OK"
else
  echo "  ❌ Health FAIL"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

# 3. Write minimal regression test (fast version, skip 10s+ reconnect)
cat > $TEST_FILE << 'EOF'
const WebSocket = require('ws');
let p = 0, f = 0;

function ws() { return new Promise((r, x) => { const w = new WebSocket('ws://localhost:PORT'); w.on('open', () => r(w)); w.on('error', x); }); }
function nextMsg(w) { return new Promise((r, x) => { const t = setTimeout(() => x('timeout'), 3000); w.once('message', d => { clearTimeout(t); r(JSON.parse(d)); }); }); }
function sendW(w, obj) { w.send(JSON.stringify(obj)); }
function assert(cond) { if (!cond) throw 'assertion failed'; }

async function t(name, fn) { try { await fn(); p++; console.log('PASS: ' + name); } catch(e) { f++; console.log('FAIL: ' + name + ' - ' + e); } }

async function main() {
  // Core protocol
  await t('T1 create_room', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const m = await nextMsg(s); assert(m.event==='room_created' && m.roomId && m.qrUrl); s.close();
  });
  await t('T2 join_room + PI', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); const j = await nextMsg(c); assert(j.playerIndex===0); c.close(); s.close();
  });
  await t('T3 inject PI', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); await nextMsg(c);
    sendW(c, {event:'game_message', type:'input.tap'}); const fwd = await nextMsg(s); assert(fwd.playerIndex===0); c.close(); s.close();
  });
  await t('T4 fake PI blocked', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); await nextMsg(c);
    sendW(c, {event:'game_message', type:'input.tap', playerIndex:999}); const fwd = await nextMsg(s); assert(fwd.playerIndex===0); c.close(); s.close();
  });
  await t('T5 broadcast', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); await nextMsg(c);
    sendW(s, {event:'broadcast', type:'state.score_update', data:{scores:'{"0":5}'}});
    const bc = await nextMsg(c); assert(bc.type==='state.score_update'); c.close(); s.close();
  });
  await t('T6 maxPlayers', async () => {
    const s = await ws(); sendW(s, {event:'create_room', maxPlayers:2}); const cr = await nextMsg(s); assert(cr.maxPlayers===2);
    const c0 = await ws(); sendW(c0, {event:'join_room', roomId:cr.roomId}); await nextMsg(c0);
    const c1 = await ws(); sendW(c1, {event:'join_room', roomId:cr.roomId}); await nextMsg(c1);
    const c2 = await ws(); sendW(c2, {event:'join_room', roomId:cr.roomId}); const rf = await nextMsg(c2); assert(rf.event==='room_full'); c0.close();c1.close();c2.close();s.close();
  });
  await t('T7 close_room', async () => {
    const s = await ws(); sendW(s, {event:'create_room'}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); await nextMsg(c);
    sendW(s, {event:'close_room'}); const rc = await nextMsg(c); assert(rc.event==='room_closed'); c.close(); s.close();
  });
  await t('T8 reconnect', async () => {
    const s = await ws(); sendW(s, {event:'create_room', maxPlayers:4}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); const j = await nextMsg(c); assert(j.reconnectToken && j.reconnectToken.length===32);
    const token = j.reconnectToken; const oPI = j.playerIndex;
    c.close(); await new Promise(r => setTimeout(r, 500));
    const c2 = await ws(); sendW(c2, {event:'reconnect', reconnectToken:token, roomId:cr.roomId}); const rc = await nextMsg(c2);
    assert(rc.event==='reconnected' && rc.playerIndex===oPI); c2.close(); s.close();
  });
  await t('T9 reconnect fail (invalid)', async () => {
    const s = await ws(); sendW(s, {event:'create_room', maxPlayers:4}); const cr = await nextMsg(s);
    const c = await ws(); sendW(c, {event:'join_room', roomId:cr.roomId}); await nextMsg(c); c.close();
    const c2 = await ws(); sendW(c2, {event:'reconnect', reconnectToken:'bad', roomId:cr.roomId}); const rf = await nextMsg(c2);
    assert(rf.event==='reconnect_failed'); c2.close(); s.close();
  });
  // v0.3.0 observability
  await t('T10 /__health', async () => {
    const http = require('http');
    const body = await new Promise((r, x) => http.get('http://localhost:PORT/__health', res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>r(d)); }).on('error',x));
    const j = JSON.parse(body); assert(j.status==='ok' && j.version==='0.3.0');
  });
  await t('T11 /__metrics', async () => {
    const http = require('http');
    const body = await new Promise((r, x) => http.get('http://localhost:PORT/__metrics', res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>r(d)); }).on('error',x));
    assert(body.includes('partygame_rooms_created_total') && body.includes('partygame_ws_connections'));
  });
  console.log('\n=== ' + p + '/' + (p+f) + ' PASS, ' + f + ' FAIL ===');
  process.exit(f > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
EOF

sed -i '' "s|localhost:PORT|localhost:$PORT|g" $TEST_FILE

# 4. Run tests
echo "→ Running regression tests..."
node $TEST_FILE
TEST_EXIT=$?

# 5. Metrics check
echo ""
echo "→ Final metrics:"
curl -s http://localhost:$PORT/__metrics | grep -E 'partygame_(rooms|ws|messages)' || true

# 6. Cleanup
kill $SERVER_PID 2>/dev/null
rm -f $TEST_FILE

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ CI PASSED"
else
  echo "❌ CI FAILED"
fi
exit $TEST_EXIT
