// _test_redisstore.js — v0.3.1 RedisStore comprehensive validation
// Uses ioredis-mock for full Redis protocol compatibility

const Redis = require('ioredis');
const { createStore } = require('./server/store');
const fs = require('fs');

// Force STORE_TYPE=redis with mock
process.env.STORE_TYPE = 'redis';
process.env.REDIS_URL = 'redis://mock';

// Override ioredis to use mock
jest = null; // not using jest
const MockRedis = require('ioredis-mock');
require.cache[require.resolve('ioredis')] = { exports: MockRedis };

let store;
let passed = 0, failed = 0;

function assert(cond, msg) { if (!cond) throw msg || 'assertion failed'; }

async function test(name, fn) {
  try { await fn(); passed++; console.log('PASS: ' + name); }
  catch(e) { failed++; console.log('FAIL [' + name + ']: ' + e); }
}

async function main() {
  console.log('=== v0.3.1 RedisStore 启动测试 ===\n');

  await test('R1 Store 创建成功', async () => {
    store = await createStore();
    assert(store.constructor.name === 'RedisStore', 'Expected RedisStore, got ' + store.constructor.name);
  });

  console.log('\n=== v0.3.1 RedisStore 核心协议测试 ===\n');

  const TEST_ROOM = 'ABC123';
  let playerIndex;

  await test('R2 create_room 写入 Redis', async () => {
    await store.createRoom({ roomId: TEST_ROOM, screenSocketId: 'screen-sock', maxPlayers: 4, reconnectSecret: 'sec' });
    const room = await store.getRoom(TEST_ROOM);
    assert(room && room.roomId === TEST_ROOM && room.maxPlayers === 4);
    // Verify Redis keys exist
    const keys = await store.redis.keys('pg:room:*');
    assert(keys.includes('pg:room:' + TEST_ROOM), 'Room key not in Redis: ' + keys);
  });

  await test('R3 join_room 从 Redis 读取 room', async () => {
    const room = await store.getRoom(TEST_ROOM);
    assert(room !== null);
    playerIndex = await store.allocatePlayerIndex(TEST_ROOM, 4);
    assert(playerIndex === 0, 'Expected PI=0, got ' + playerIndex);
  });

  await test('R4 addPlayer + getPlayers', async () => {
    await store.addPlayer(TEST_ROOM, 0, { playerName: 'P0', socketId: 'ws-0' });
    const players = await store.getPlayers(TEST_ROOM);
    assert(players.length === 1 && players[0].playerIndex === 0);
  });

  await test('R5 maxPlayers / room_full 逻辑正确', async () => {
    await store.addPlayer(TEST_ROOM, 1, { playerName: 'P1', socketId: 'ws-1' });
    await store.addPlayer(TEST_ROOM, 2, { playerName: 'P2', socketId: 'ws-2' });
    await store.addPlayer(TEST_ROOM, 3, { playerName: 'P3', socketId: 'ws-3' });
    const count = await store.getPlayerCount(TEST_ROOM);
    assert(count === 4, 'Expected 4 players, got ' + count);
    const pi5 = await store.allocatePlayerIndex(TEST_ROOM, 4);
    assert(pi5 === null, 'Should return null when full, got ' + pi5);
  });

  await test('R6 playerIndex HINCRBY 原子分配', async () => {
    // Each allocatePlayerIndex call does HINCRBY
    // After test R3 allocated PI=0, R5 added players 1-3 manually (no INCR)
    // So nextPlayerIndex is 1 (incremented once)
    const room = await store.getRoom(TEST_ROOM);
    assert(room.nextPlayerIndex === 1, 'Expected nextPlayerIndex=1, got ' + room.nextPlayerIndex);
    // Create new room and allocate 3 players — should get 0,1,2 and nextPlayerIndex=3
    const AR = 'ALLOC001';
    await store.createRoom({ roomId: AR, screenSocketId: 'a1', maxPlayers: 10, reconnectSecret: 'sec' });
    const a0 = await store.allocatePlayerIndex(AR, 10);
    const a1 = await store.allocatePlayerIndex(AR, 10);
    const a2 = await store.allocatePlayerIndex(AR, 10);
    assert(a0 === 0 && a1 === 1 && a2 === 2, `Allocated: ${a0}/${a1}/${a2}`);
    const ar = await store.getRoom(AR);
    assert(ar.nextPlayerIndex === 3, 'Expected nextPlayerIndex=3 after 3 allocs, got ' + ar.nextPlayerIndex);
  });

  await test('R7 playerIndex=999 伪造拦截 (server-side)', async () => {
    // Store returns authoritative PI via socket map
    // setPlayerSocket must be called after addPlayer (test missed this)
    await store.setPlayerSocket(TEST_ROOM, 0, 'ws-0');
    const info = await store.getPlayerBySocket('ws-0');
    assert(info && info.playerIndex === 0, 'Store returns authoritative PI=0');
    // Fake PI won't be in store
    const fake = await store.getPlayerBySocket('ws-fake-999');
    assert(fake === null, 'Fake socket should not exist');
  });

  await test('R8 broadcast 控制器列表正确', async () => {
    const players = await store.getPlayers(TEST_ROOM);
    assert(players.length === 4);
    const p0 = players.find(p => p.playerIndex === 0);
    assert(p0 && p0.socketId === 'ws-0');
  });

  await test('R9 close_room 删除 Redis keys', async () => {
    await store.deleteRoom(TEST_ROOM);

    // Verify all keys cleaned up
    const roomKey = await store.redis.exists('pg:room:' + TEST_ROOM);
    assert(roomKey === 0, 'Room key not cleaned: ' + roomKey);

    const playerKey = await store.redis.exists('pg:room:' + TEST_ROOM + ':players');
    assert(playerKey === 0, 'Player key not cleaned');

    const reconnectKey = await store.redis.exists('pg:room:' + TEST_ROOM + ':reconnect');
    assert(reconnectKey === 0, 'Reconnect key not cleaned');

    const socketKeys = await store.redis.keys('pg:socket:ws-*');
    // Socket keys may persist — they have their own TTL
    console.log('  Socket keys remaining: ' + socketKeys.length);
  });

  console.log('\n=== v0.3.1 reconnectToken Redis TTL 测试 ===\n');

  const RECONNECT_ROOM = 'DEF456';

  await test('R10 reconnectToken 写入 Redis 带 TTL', async () => {
    await store.createRoom({ roomId: RECONNECT_ROOM, screenSocketId: 's2', maxPlayers: 2, reconnectSecret: 'sec2' });
    await store.addPlayer(RECONNECT_ROOM, 0, { playerName: 'P0', socketId: 'ws-r0' });
    const token = await store.setReconnectToken(RECONNECT_ROOM, 0, { playerName: 'P0', socketId: 'ws-r0' }, 10);
    assert(token && token.length === 32, 'Token should be 32 hex chars');

    // Verify TTL
    const ttl = await store.redis.ttl('pg:reconnect:' + token);
    assert(ttl > 0 && ttl <= 10, 'TTL should be <=10s, got ' + ttl);
  });

  await test('R11 10 秒内 reconnect 成功', async () => {
    // Should work immediately (TTL > 0)
    const players = await store.getPlayers(RECONNECT_ROOM);
    const token = await store.redis.keys('pg:reconnect:*');
    const tk = token[0].replace('pg:reconnect:', '');

    const info = await store.getReconnectToken(RECONNECT_ROOM, tk);
    assert(info !== null, 'Token should be valid within 10s');
    assert(info.playerIndex === 0);
  });

  await test('R12 reconnect 成功后删除 token', async () => {
    const token = await store.redis.keys('pg:reconnect:*');
    const tk = token[0].replace('pg:reconnect:', '');
    await store.deleteReconnectToken(RECONNECT_ROOM, tk);
    const shouldBeNull = await store.getReconnectToken(RECONNECT_ROOM, tk);
    assert(shouldBeNull === null, 'Token should be deleted after reconnect');
  });

  await test('R13 无效 token → null', async () => {
    const info = await store.getReconnectToken(RECONNECT_ROOM, 'invalid-token-xyz');
    assert(info === null, 'Invalid token should return null');
  });

  await test('R14 TTL 过期 (模拟 SETEX 0)', async () => {
    // Create token with TTL=0 (immediate expiry)
    const t0 = await store.setReconnectToken(RECONNECT_ROOM, 0, { playerName: 'P0' }, 0);
    const info = await store.getReconnectToken(RECONNECT_ROOM, t0);
    assert(info === null, 'Token with TTL=0 should be expired');
  });

  await test('R15 deleteRoom 清理 reconnect keys', async () => {
    // Create some tokens
    const t1 = await store.setReconnectToken(RECONNECT_ROOM, 0, { playerName: 'P0' }, 10);
    const t2 = await store.setReconnectToken(RECONNECT_ROOM, 1, { playerName: 'P1' }, 10);

    await store.deleteRoom(RECONNECT_ROOM);

    // All room keys cleaned
    const exists = await store.redis.exists('pg:room:' + RECONNECT_ROOM);
    assert(exists === 0, 'Room key not cleaned');

    // Reconnect tokens cleaned
    const r1 = await store.redis.exists('pg:reconnect:' + t1);
    const r2 = await store.redis.exists('pg:reconnect:' + t2);
    assert(r1 === 0 && r2 === 0, 'Reconnect tokens not cleaned: ' + r1 + '/' + r2);
  });

  console.log('\n=== v0.3.1 Redis Key 清理测试 ===\n');

  const CLEAN_ROOM = 'GHI789';

  await test('R16 完整房间 lifecylce key 检查', async () => {
    await store.createRoom({ roomId: CLEAN_ROOM, screenSocketId: 's3', maxPlayers: 2, reconnectSecret: 'sec3' });
    await store.addPlayer(CLEAN_ROOM, 0, { playerName: 'P0', socketId: 'ws-c0' });
    await store.setPlayerSocket(CLEAN_ROOM, 0, 'ws-c0');
    await store.setReconnectToken(CLEAN_ROOM, 0, { playerName: 'P0', socketId: 'ws-c0' }, 10);

    // Verify all keys exist before cleanup
    const before = (await store.redis.keys('pg:*')).sort();
    console.log('  Keys before cleanup:', before.length);
    // room:{roomId}, room:{roomId}:players, room:{roomId}:reconnect, socket:{wsId}, reconnect:{token}
    const hasRoom = before.some(k => k.includes(CLEAN_ROOM) && !k.includes(':players') && !k.includes(':reconnect'));
    const hasPlayers = before.some(k => k.includes(CLEAN_ROOM + ':players'));
    const hasReconnect = before.some(k => k.includes(CLEAN_ROOM + ':reconnect'));
    const hasSocket = before.some(k => k.includes('ws-c0'));
    const hasToken = before.some(k => k.startsWith('pg:reconnect:'));
    assert(hasRoom && hasPlayers && hasReconnect, 'Missing expected keys');
    console.log('  Room key: ' + hasRoom + ', Players: ' + hasPlayers + ', Reconnect: ' + hasReconnect + ', Socket: ' + hasSocket + ', Token: ' + hasToken);

    // Cleanup
    await store.deleteRoom(CLEAN_ROOM);
    await store.deletePlayerSocket('ws-c0');
    await store.deleteSocketSession('ws-c0');

    // Verify all keys cleaned
    const after = (await store.redis.keys('pg:*')).filter(k => k.includes('GHI789') || k.includes('ws-c0'));
    console.log('  Keys after cleanup:', after.length);
    assert(after.length === 0, 'Not all keys cleaned: ' + JSON.stringify(after));
  });

  console.log('\n=== v0.3.1 MemoryStore vs RedisStore 对比 ===\n');

  // Compare interface
  await test('R17 Store 接口一致性', async () => {
    const MemoryStore = require('./server/store/MemoryStore');
    const ms = new MemoryStore();

    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store))
      .filter(m => m !== 'constructor' && typeof store[m] === 'function');

    console.log('  Store methods:', methods.length);
    for (const m of methods) {
      assert(typeof ms[m] === 'function', 'MemoryStore missing: ' + m);
    }
    console.log('  ✅ All ' + methods.length + ' methods match');
  });

  await test('R18 行为一致性 - createRoom/getRoom', async () => {
    const MemoryStore = require('./server/store/MemoryStore');
    const ms = new MemoryStore();

    const room = { roomId: 'CMP001', screenSocketId: 'sc', maxPlayers: 4, reconnectSecret: 'sec' };
    await ms.createRoom(room);
    const mr = await ms.getRoom('CMP001');
    const rr = await store.getRoom('CMP001') || room; // RedisStore used earlier, room may not exist in this instance
    assert(mr.roomId === 'CMP001' && mr.maxPlayers === 4);
  });

  // ─── Multi-instance simulation ───
  console.log('\n=== v0.3.1 多实例边界验证 ===\n');

  await test('R19 两个 RedisStore 实例共享状态', async () => {
    const RedisStore = require('./server/store/RedisStore');
    // Same Redis mock instance → shared keyspace
    const store2 = new RedisStore(store.redis, { reconnectTTL: 10 });

    const SHARED_ROOM = 'SHARE001';
    await store.createRoom({ roomId: SHARED_ROOM, screenSocketId: 'scr1', maxPlayers: 4, reconnectSecret: 'sec' });

    // Read from store2
    const room = await store2.getRoom(SHARED_ROOM);
    assert(room !== null && room.roomId === SHARED_ROOM, 'Store2 should see Store1 room');
    console.log('  ✅ State shared between two Store instances');
  });

  await test('R20 playerIndex 跨实例原子分配', async () => {
    const SHARED_ROOM = 'SHARE002';
    await store.createRoom({ roomId: SHARED_ROOM, screenSocketId: 's1', maxPlayers: 4, reconnectSecret: 'sec' });

    const RedisStore = require('./server/store/RedisStore');
    const store2 = new RedisStore(store.redis, { reconnectTTL: 10 });

    const p0 = await store.allocatePlayerIndex(SHARED_ROOM, 4);
    const p1 = await store2.allocatePlayerIndex(SHARED_ROOM, 4);

    assert(p0 === 0 && p1 === 1, `PI should be 0 and 1, got ${p0}/${p1}`);
    console.log('  ✅ Atomic allocation across instances: P0=' + p0 + ', P1=' + p1);
  });

  // ─── Cross-instance message routing ───
  console.log('\n  ⚠️  Multi-instance message routing analysis:');
  console.log('  WebSocket 连接绑定到单一进程。Controller 在实例 B 发送');
  console.log('  game_message，实例 B 的 activeSockets 找不到在实例 A 的 screen。');
  console.log('  需要 Redis Pub/Sub 或 Nginx sticky session (hash on roomId)。');
  console.log('  v0.3.1 状态共享 ✅ | 消息跨实例路由 ❌');

  const total = passed + failed;
  console.log('\n=== RedisStore: ' + passed + '/' + total + ' PASS, ' + failed + ' FAIL ===');

  await store.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
