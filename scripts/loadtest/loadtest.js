#!/usr/bin/env node
// scripts/loadtest/loadtest.js — v0.3.0 WebSocket Load Test
// Usage: node scripts/loadtest/loadtest.js [--rooms=N] [--players=N] [--duration=S] [--host=H:PORT]
// Default: 10 rooms, 4 players/room, 30s duration

const WebSocket = require('ws');

const argv = process.argv.slice(2);
function arg(k, def) { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : def; }

const HOST = arg('--host', 'localhost:3000');
const ROOMS = parseInt(arg('--rooms', '10'));
const PLAYERS = parseInt(arg('--players', '4'));
const DURATION = parseInt(arg('--duration', '30'));
const TICK_MS = 200;

let roomsActive = 0, connections = 0, messagesSent = 0, messagesRecv = 0, errors = 0;

function ws() { return new Promise((res, rej) => {
  const w = new WebSocket(`ws://${HOST}`); w.on('open', () => res(w)); w.on('error', rej);
}); }

function send(w, obj) { try { w.send(JSON.stringify(obj)); messagesSent++; } catch(e) { errors++; } }
function wait(n) { return new Promise(r => setTimeout(r, n)); }
function rand() { return Math.random().toString(36).slice(2, 10); }

async function createRoom() {
  try {
    const screen = await ws();
    send(screen, { event: 'create_room', maxPlayers: PLAYERS });
    const msg = await new Promise((res, rej) => { const t = setTimeout(() => rej('timeout'), 5000); screen.once('message', d => { clearTimeout(t); res(JSON.parse(d)); }); });
    screen.roomId = msg.roomId;
    messagesRecv++;
    connections++; roomsActive++;
    return screen;
  } catch(e) { errors++; return null; }
}

async function joinRoom(roomId) {
  try {
    const ctrl = await ws();
    send(ctrl, { event: 'join_room', roomId, playerName: `Tester_${rand()}` });
    const msg = await new Promise((res, rej) => { const t = setTimeout(() => rej('timeout'), 5000); ctrl.once('message', d => { clearTimeout(t); res(JSON.parse(d)); }); });
    messagesRecv++;
    connections++;
    ctrl.on('message', () => { messagesRecv++; });
    return ctrl;
  } catch(e) { errors++; return null; }
}

async function main() {
  console.log(`\n🔨 PartyGameSDK v0.3.0 Load Test`);
  console.log(`   Target:  ws://${HOST}`);
  console.log(`   Rooms:   ${ROOMS} × Players: ${PLAYERS} = ${ROOMS * PLAYERS} controllers`);
  console.log(`   Duration: ${DURATION}s\n`);

  const start = Date.now();
  const screens = [];

  // Phase 1: Create rooms + join players
  console.log('Phase 1: Creating rooms and joining players...');
  for (let i = 0; i < ROOMS; i++) {
    const screen = await createRoom();
    if (screen) {
      screens.push(screen);
      const ctrls = [];
      for (let j = 0; j < PLAYERS; j++) {
        const c = await joinRoom(screen.roomId);
        if (c) ctrls.push(c);
      }
      screen.ctrls = ctrls;
    }
    if ((i + 1) % 5 === 0) console.log(`  ${i + 1}/${ROOMS} rooms created`);
  }

  console.log(`  Done. ${roomsActive} rooms, ${connections} connections\n`);

  // Phase 2: Message storm
  console.log('Phase 2: Message storm (game_message + broadcast)...');
  const stormEnd = Date.now() + DURATION * 1000;
  let tick = 0;

  while (Date.now() < stormEnd) {
    for (const screen of screens) {
      if (!screen.ctrls) continue;
      // Each controller sends a game_message
      for (const c of screen.ctrls) {
        send(c, { event: 'game_message', type: 'input.tap' });
      }
      // Screen broadcasts score
      if (tick % 5 === 0) {
        send(screen, { event: 'broadcast', type: 'state.score_update', data: { scores: '{"0":' + tick + '}' } });
      }
    }
    tick++;
    await wait(TICK_MS);
  }

  // Phase 3: Cleanup
  console.log('\nPhase 3: Cleanup...');
  for (const screen of screens) {
    send(screen, { event: 'close_room' });
    screen.close();
    for (const c of (screen.ctrls || [])) c.close();
  }
  await wait(1000);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log([
    '',
    '=== Results ===',
    `Duration:        ${elapsed}s`,
    `Rooms created:   ${roomsActive}`,
    `WS connections:  ${connections}`,
    `Messages sent:   ${messagesSent}`,
    `Messages recv:   ${messagesRecv}`,
    `Msg/sec (send):  ${(messagesSent / elapsed).toFixed(1)}`,
    `Msg/sec (total): ${((messagesSent + messagesRecv) / elapsed).toFixed(1)}`,
    `Errors:          ${errors}`,
    '',
    errors > 0 ? '⚠️  WARNING: Errors detected' : '✅ All clear',
  ].join('\n'));

  // Fetch metrics
  try {
    const h = await require('http').get(`http://${HOST}/__metrics`, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => {
        console.log('\n=== Server Metrics ===\n' + d.split('\n').filter(l => l && !l.startsWith('#')).join('\n'));
      });
    });
  } catch (e) {}

  process.exit(errors > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
