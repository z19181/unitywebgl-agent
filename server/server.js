const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// v0.3.0: Structured logging + metrics + error codes
const log = require('./logger');
const metrics = require('./metrics');
const { ErrorCode, sendErrorCode } = require('./errors');

// v0.3.1: Store abstraction (MemoryStore or RedisStore)
let store;
const storeModule = require('./store');

// v0.3.4: Admin API
const { createAdminRouter } = require('./admin');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ========== v0.3.0: Observability endpoints ==========
app.get('/__metrics', (req, res) => {
  res.type('text/plain');
  res.send(metrics.prometheusText());
});

app.get('/__health', (req, res) => {
  res.json({ status: 'ok', version: '0.3.1', uptime: process.uptime(), ...metrics.jsonSummary() });
});

// ========== Static file serving ==========
app.use('/screen', express.static(__dirname + '/../screen'));
app.use('/controller', express.static(__dirname + '/../controller'));

// ========== Constants ==========
const RECONNECT_TIMEOUT = 10 * 1000;

const MSG_TYPE = {
  CREATE_ROOM: 'create_room', ROOM_CREATED: 'room_created',
  JOIN_ROOM: 'join_room', ROOM_JOINED: 'room_joined',
  ROOM_NOT_FOUND: 'room_not_found', ROOM_FULL: 'room_full',
  PLAYER_JOINED: 'player_joined', PLAYER_LEFT: 'player_left',
  PLAYERS_CHANGED: 'players.changed',
  RECONNECT: 'reconnect', RECONNECTED: 'reconnected', RECONNECT_FAILED: 'reconnect_failed',
  GAME_MESSAGE: 'game_message', BROADCAST: 'broadcast',
  SCREEN_READY: 'screen_ready',
  CLOSE_ROOM: 'close_room', ROOM_CLOSED: 'room_closed',
};

// ========== v0.3.1: Active WS connections (for broadcast to room controllers) ==========
// Map: ws.id → ws (only active controllers in this process)
const activeSockets = new Map();

// ========== WebSocket connection ==========
wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.data = {};
  activeSockets.set(ws.id, ws);
  metrics.increment('wsConnections', 1);
  log.info('connected', { wsId: ws.id });

  ws.on('message', (data) => {
    metrics.trackMessage();
    try { handleMessage(ws, JSON.parse(data)); }
    catch (e) {
      metrics.trackError(ErrorCode.CONN_INVALID_JSON.code);
      log.error('Invalid JSON', { wsId: ws.id, error: e.message });
      sendErrorCode(ws, ErrorCode.CONN_INVALID_JSON);
    }
  });

  ws.on('close', async () => {
    metrics.increment('wsDisconnections', 1);
    activeSockets.delete(ws.id);
    await handleDisconnect(ws);
  });
});

// ========== Message routing ==========
function handleMessage(ws, message) {
  const t0 = Date.now();  // v0.3.3
  const eventType = message.event || message.type;
  log.info(eventType, { wsId: ws.id, roomId: ws.data.roomId, playerIndex: ws.data.playerIndex, type: message.type });

  switch (eventType) {
    case MSG_TYPE.CREATE_ROOM:  handleCreateRoom(ws, message); break;
    case MSG_TYPE.JOIN_ROOM:    handleJoinRoom(ws, message); break;
    case MSG_TYPE.CLOSE_ROOM:   handleCloseRoom(ws); break;
    case MSG_TYPE.GAME_MESSAGE: handleGameMessage(ws, message); break;
    case MSG_TYPE.BROADCAST:    handleBroadcast(ws, message); break;
    case MSG_TYPE.SCREEN_READY: handleScreenReady(ws); break;
    case MSG_TYPE.RECONNECT:    handleReconnect(ws, message); break;
    default: log.warn('unknown_msg', { wsId: ws.id, eventType });
  }

  // v0.3.3: track event processing duration
  metrics.trackEventDuration(eventType, Date.now() - t0);
}

// ========== Helpers ==========
function broadcastToControllers(roomId, message) {
  let count = 0;
  for (const [wsId, ws] of activeSockets) {
    if (ws.data.role === 'controller' && ws.data.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      count++;
    }
  }
  if (count > 0) metrics.increment('messagesSent', count);
  return count;
}

async function sendToScreen(roomId, message) {
  for (const [wsId, ws] of activeSockets) {
    if (ws.data.role === 'screen' && ws.data.roomId === roomId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
  }
  return false;
}

async function sendToSocketById(socketId, message) {
  const ws = activeSockets.get(socketId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// ========== Room management ==========
async function handleCreateRoom(ws, message) {
  if (ws.data.role === 'screen') { sendErrorCode(ws, ErrorCode.ROLE_ALREADY_SCREEN); return; }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const maxPlayers = Math.max(1, Math.min(parseInt(message.maxPlayers) || 4, 16));
  const reconnectSecret = crypto.randomBytes(16).toString('hex');

  await store.createRoom({
    roomId, screenSocketId: ws.id, maxPlayers, reconnectSecret,
  });

  metrics.increment('roomsCreated', 1);
  ws.data = { role: 'screen', roomId };

  const qrUrl = `http://${getServerHost()}/controller?room=${roomId}`;
  ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_CREATED, roomId, qrUrl, maxPlayers, reconnectSecret }));

  log.info('room_created', { wsId: ws.id, roomId, maxPlayers });
}

async function handleJoinRoom(ws, message) {
  const { roomId } = message;
  if (!roomId || !(await store.roomExists(roomId))) {
    ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_NOT_FOUND, roomId }));
    return;
  }

  const room = await store.getRoom(roomId);
  if (ws.data.role === 'controller' && ws.data.roomId === roomId) {
    sendErrorCode(ws, ErrorCode.ROOM_ALREADY_JOINED);
    return;
  }

  const playerCount = await store.getPlayerCount(roomId);
  if (playerCount >= room.maxPlayers) {
    ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_FULL, roomId, maxPlayers: room.maxPlayers }));
    return;
  }

  const playerIndex = await store.allocatePlayerIndex(roomId, room.maxPlayers);
  if (playerIndex === null) {
    ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_FULL, roomId, maxPlayers: room.maxPlayers }));
    return;
  }

  const playerName = message.playerName || `Player ${playerIndex}`;

  ws.data = { role: 'controller', roomId, playerIndex };
  metrics.increment('controllersActive', 1);  // v0.3.3
  await store.setPlayerSocket(roomId, playerIndex, ws.id);
  await store.addPlayer(roomId, playerIndex, { playerName, socketId: ws.id });

  // v0.3.1: store.setReconnectToken generates and returns the token
  const reconnectToken = await store.setReconnectToken(roomId, playerIndex, { playerName, socketId: ws.id }, 10);

  const players = await store.getPlayers(roomId);

  ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_JOINED, roomId, playerIndex, playerName, maxPlayers: room.maxPlayers, players, reconnectToken }));
  await sendToScreen(roomId, { event: MSG_TYPE.PLAYER_JOINED, playerIndex, playerName, playerCount: playerCount + 1, players });
  broadcastToControllers(roomId, { event: MSG_TYPE.PLAYERS_CHANGED, players });

  log.info('player_joined', { wsId: ws.id, roomId, playerIndex, playerName, count: playerCount + 1, max: room.maxPlayers });
}

// ========== Game message ==========
async function handleGameMessage(ws, message) {
  if (ws.data.role !== 'controller') { sendErrorCode(ws, ErrorCode.ROLE_NOT_CONTROLLER); return; }
  const { roomId, playerIndex } = ws.data;
  if (!roomId) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  if (!(await store.roomExists(roomId))) { sendErrorCode(ws, ErrorCode.ROOM_NOT_FOUND); return; }

  // ⚠️ Iron law: strip fake playerIndex from controller body
  if (message.playerIndex !== undefined) {
    log.warn('fake_playerIndex', { wsId: ws.id, fake: message.playerIndex });
    metrics.trackError(ErrorCode.INPUT_FAKE_PLAYERINDEX.code);
    delete message.playerIndex;
  }
  // ⚠️ Iron law: inject real playerIndex from session
  message.playerIndex = playerIndex;

  // v0.3.1: Screen socket might be on another instance.
  // We broadcast locally; cross-instance needs Redis Pub/Sub (not in v0.3.1).
  const room = await store.getRoom(roomId);
  if (!room) return;
  await sendToSocketById(room.screenSocketId, message);
}

// ========== Broadcast ==========
async function handleBroadcast(ws, message) {
  if (ws.data.role !== 'screen') { sendErrorCode(ws, ErrorCode.ROLE_NOT_SCREEN); return; }
  const { roomId } = ws.data;
  if (!roomId || !(await store.roomExists(roomId))) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  const count = broadcastToControllers(roomId, message);
  log.info('broadcast', { roomId, type: message.type, count });
}

// ========== Screen ready ==========
function handleScreenReady(ws) { if (!ws.data.roomId) handleCreateRoom(ws, {}); }

// ========== Close room ==========
async function handleCloseRoom(ws) {
  if (ws.data.role !== 'screen') { sendErrorCode(ws, ErrorCode.ROLE_NOT_SCREEN_CLOSE); return; }
  const { roomId } = ws.data;
  if (!roomId || !(await store.roomExists(roomId))) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  broadcastToControllers(roomId, { event: MSG_TYPE.ROOM_CLOSED, roomId, reason: 'host_closed' });
  await store.deleteRoom(roomId);
  metrics.increment('roomsDestroyed', 1);
  log.info('room_closed', { wsId: ws.id, roomId, reason: 'host_closed' });
}

// ========== Disconnect ==========
async function handleDisconnect(ws) {
  const { role, roomId, playerIndex } = ws.data;
  if (!roomId) return;
  if (!(await store.roomExists(roomId))) return;

  log.info('disconnected', { wsId: ws.id, role, roomId, playerIndex });

  if (role === 'screen') {
    broadcastToControllers(roomId, { event: MSG_TYPE.ROOM_CLOSED, roomId, reason: 'host_disconnected' });
    await store.deleteRoom(roomId);
    metrics.increment('roomsDestroyed', 1);
    log.info('room_destroyed', { wsId: ws.id, roomId, reason: 'host_disconnected' });
  } else if (role === 'controller' && playerIndex !== undefined) {
    // v0.3.3: decrement controller count
    metrics.increment('controllersActive', -1);

    // v0.3.1: Don't remove player from store — keep for reconnect window.
    // Broadcast player_left + players.changed immediately for game logic.
    await store.deletePlayerSocket(ws.id);
    const players = await store.getPlayers(roomId);
    await sendToScreen(roomId, { event: MSG_TYPE.PLAYER_LEFT, playerIndex, playerCount: players.length, players });
    broadcastToControllers(roomId, { event: MSG_TYPE.PLAYERS_CHANGED, players });
    log.info('player_disconnected', { wsId: ws.id, roomId, playerIndex });
  }
}

// ========== Reconnect ==========
async function handleReconnect(ws, message) {
  const { reconnectToken, roomId } = message;
  if (!reconnectToken || !roomId) { ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'missing token or roomId' })); return; }
  if (!(await store.roomExists(roomId))) { ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'room not found' })); return; }

  const tokenInfo = await store.getReconnectToken(roomId, reconnectToken);
  if (!tokenInfo) {
    ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'invalid or expired token' }));
    metrics.trackReconnect(false);
    return;
  }

  const { playerIndex, playerName } = tokenInfo;
  ws.data = { role: 'controller', roomId, playerIndex };
  await store.setPlayerSocket(roomId, playerIndex, ws.id);

  // Update player's socketId in store
  await store.addPlayer(roomId, playerIndex, { playerName, socketId: ws.id });
  await store.deleteReconnectToken(roomId, reconnectToken);
  const players = await store.getPlayers(roomId);
  metrics.trackReconnect(true);

  ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECTED, playerIndex, playerName, roomId, players }));
  await sendToScreen(roomId, { event: 'player_reconnected', playerIndex, playerName, playerCount: players.length });
  log.info('reconnected', { wsId: ws.id, roomId, playerIndex, playerName });
}

// ========== Utilities ==========
function sendError(ws, msg) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'error', message: msg })); }
function getServerHost() { return process.env.SERVER_HOST || 'localhost:3000'; }

// ========== Startup ==========
const PORT = process.env.PORT || 3000;

(async () => {
  store = await storeModule.createStore();
  // v0.3.3: Sync room count for metrics (MemoryStore getRoomCount is sync, Redis is async)
  if (store.constructor.name === 'MemoryStore') {
    metrics.setRoomCountFn(() => store.rooms.size);
  } else {
    metrics.setRoomCountFn(() => store.getRoomCount().then(n => n, () => 0));
  }

  // v0.3.4: Admin API (mounted BEFORE static to take priority over index.html)
  const admin = createAdminRouter({ store, metrics, activeSockets, broadcastToControllers });
  app.use('/admin', admin.router);
  // Admin UI static files (catch-all for non-API /admin/* paths)
  app.use('/admin', express.static(__dirname + '/../admin'));

  server.listen(PORT, () => {
    log.info('startup', { port: PORT, version: '0.3.1', store: process.env.STORE_TYPE || 'memory' });
    console.log(['',
      '🎮 PartyGameSDK v0.3.1',
      `📡 http://localhost:${PORT}`,
      `📊 Metrics: http://localhost:${PORT}/__metrics`,
      `💚 Health:  http://localhost:${PORT}/__health`,
      `📺 Screen:   http://localhost:${PORT}/screen`,
      `🎮 Ctrl:     http://localhost:${PORT}/controller`,
      '',
    ].join('\n'));
  });
})();
