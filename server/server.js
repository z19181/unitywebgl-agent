const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// v0.3.0: Structured logging + metrics + error codes
const log = require('./logger');
const metrics = require('./metrics');
const { ErrorCode, sendErrorCode } = require('./errors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ========== v0.3.0: Observability endpoints ==========
app.get('/__metrics', (req, res) => {
  res.type('text/plain');
  res.send(metrics.prometheusText());
});

app.get('/__health', (req, res) => {
  res.json({ status: 'ok', version: '0.3.0', uptime: process.uptime(), ...metrics.jsonSummary() });
});

// ========== Static file serving ==========
app.use('/screen', express.static(__dirname + '/../screen'));
app.use('/controller', express.static(__dirname + '/../controller'));

// ========== Data model ==========
const rooms = new Map();
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

// ========== WebSocket connection ==========
wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.data = {};
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

  ws.on('close', () => {
    metrics.increment('wsDisconnections', 1);
    handleDisconnect(ws);
  });
});

// ========== Message routing ==========
function handleMessage(ws, message) {
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
}

// ========== Helpers ==========
function getPlayersList(room) {
  return Array.from(room.controllers.values()).map(i => ({ playerIndex: i.playerIndex, playerName: i.playerName }));
}

function broadcastToControllers(room, message) {
  let count = 0;
  room.controllers.forEach((info, ctrlWs) => {
    if (ctrlWs.readyState === WebSocket.OPEN) { ctrlWs.send(JSON.stringify(message)); count++; }
  });
  if (count > 0) metrics.increment('messagesSent', count);
  return count;
}

function sendToScreen(room, message) {
  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify(message));
  }
}

// ========== Room management ==========
function handleCreateRoom(ws, message) {
  if (ws.data.role === 'screen') { sendErrorCode(ws, ErrorCode.ROLE_ALREADY_SCREEN); return; }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const maxPlayers = Math.max(1, Math.min(parseInt(message.maxPlayers) || 4, 16));

  const room = {
    roomId, screenSocket: ws,
    controllers: new Map(), disconnectedControllers: new Map(),
    players: [], nextPlayerIndex: 0, maxPlayers,
    reconnectSecret: crypto.randomBytes(16).toString('hex'),
  };

  rooms.set(roomId, room);
  metrics.increment('roomsCreated', 1);
  ws.data = { role: 'screen', roomId };

  const qrUrl = `http://${getServerHost()}/controller?room=${roomId}`;
  ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_CREATED, roomId, qrUrl, maxPlayers, reconnectSecret: room.reconnectSecret }));

  log.info('room_created', { wsId: ws.id, roomId, maxPlayers });
}

function handleJoinRoom(ws, message) {
  const { roomId } = message;
  if (!roomId || !rooms.has(roomId)) { ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_NOT_FOUND, roomId })); return; }
  const room = rooms.get(roomId);
  if (ws.data.role === 'controller' && ws.data.roomId === roomId) { sendErrorCode(ws, ErrorCode.ROOM_ALREADY_JOINED); return; }
  if (room.controllers.size >= room.maxPlayers) { ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_FULL, roomId, maxPlayers: room.maxPlayers })); return; }

  const playerIndex = room.nextPlayerIndex++;
  const playerName = message.playerName || `Player ${playerIndex}`;
  const reconnectToken = crypto.randomBytes(16).toString('hex');

  ws.data = { role: 'controller', roomId, playerIndex };
  room.controllers.set(ws, { playerIndex, playerName, reconnectToken });
  room.players = getPlayersList(room);

  ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_JOINED, roomId, playerIndex, playerName, maxPlayers: room.maxPlayers, players: room.players, reconnectToken }));
  sendToScreen(room, { event: MSG_TYPE.PLAYER_JOINED, playerIndex, playerName, playerCount: room.controllers.size, players: room.players });
  broadcastToControllers(room, { event: MSG_TYPE.PLAYERS_CHANGED, players: room.players });

  log.info('player_joined', { wsId: ws.id, roomId, playerIndex, playerName, count: room.controllers.size, max: room.maxPlayers });
}

// ========== Game message ==========
function handleGameMessage(ws, message) {
  if (ws.data.role !== 'controller') { sendErrorCode(ws, ErrorCode.ROLE_NOT_CONTROLLER); return; }
  const { roomId, playerIndex } = ws.data;
  if (!roomId) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  const room = rooms.get(roomId);
  if (!room) { sendErrorCode(ws, ErrorCode.ROOM_NOT_FOUND); return; }

  if (message.playerIndex !== undefined) {
    log.warn('fake_playerIndex', { wsId: ws.id, fake: message.playerIndex });
    metrics.trackError(ErrorCode.INPUT_FAKE_PLAYERINDEX.code);
    delete message.playerIndex;
  }
  message.playerIndex = playerIndex;

  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify(message));
  } else {
    log.warn('no_screen', { wsId: ws.id, roomId });
  }
}

// ========== Broadcast ==========
function handleBroadcast(ws, message) {
  if (ws.data.role !== 'screen') { sendErrorCode(ws, ErrorCode.ROLE_NOT_SCREEN); return; }
  const { roomId } = ws.data;
  if (!roomId || !rooms.has(roomId)) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  const count = broadcastToControllers(rooms.get(roomId), message);
  log.info('broadcast', { roomId, type: message.type, count });
}

// ========== Screen ready ==========
function handleScreenReady(ws) { if (!ws.data.roomId) handleCreateRoom(ws, {}); }

// ========== Close room (v0.2.1) ==========
function handleCloseRoom(ws) {
  if (ws.data.role !== 'screen') { sendErrorCode(ws, ErrorCode.ROLE_NOT_SCREEN_CLOSE); return; }
  const { roomId } = ws.data;
  if (!roomId || !rooms.has(roomId)) { sendErrorCode(ws, ErrorCode.ROLE_NO_ROOM); return; }
  broadcastToControllers(rooms.get(roomId), { event: MSG_TYPE.ROOM_CLOSED, roomId, reason: 'host_closed' });
  rooms.delete(roomId);
  metrics.increment('roomsDestroyed', 1);
  log.info('room_closed', { wsId: ws.id, roomId, reason: 'host_closed' });
}

// ========== Disconnect ==========
function handleDisconnect(ws) {
  const { role, roomId, playerIndex } = ws.data;
  log.info('disconnected', { wsId: ws.id, role, roomId, playerIndex });
  if (!roomId || !rooms.has(roomId)) return;
  const room = rooms.get(roomId);

  if (role === 'screen') {
    broadcastToControllers(room, { event: MSG_TYPE.ROOM_CLOSED, roomId, reason: 'host_disconnected' });
    rooms.delete(roomId);
    metrics.increment('roomsDestroyed', 1);
    log.info('room_destroyed', { wsId: ws.id, roomId, reason: 'host_disconnected' });
  } else if (role === 'controller') {
    const info = room.controllers.get(ws);
    if (!info) return;
    room.controllers.delete(ws);
    room.players = getPlayersList(room);
    sendToScreen(room, { event: MSG_TYPE.PLAYER_LEFT, playerIndex, playerCount: room.controllers.size, players: room.players });
    broadcastToControllers(room, { event: MSG_TYPE.PLAYERS_CHANGED, players: room.players });

    const timer = setTimeout(() => {
      if (room.disconnectedControllers.delete(info.reconnectToken)) {
        log.info('reconnect_timeout', { roomId, playerIndex });
      }
    }, RECONNECT_TIMEOUT);

    room.disconnectedControllers.set(info.reconnectToken, { ws, playerIndex: info.playerIndex, playerName: info.playerName, reconnectToken: info.reconnectToken, timer });
    log.info('player_disconnected', { wsId: ws.id, roomId, playerIndex });
  }
}

// ========== Reconnect (v0.2.3) ==========
function handleReconnect(ws, message) {
  const { reconnectToken, roomId } = message;
  if (!reconnectToken || !roomId) { ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'missing token or roomId' })); return; }
  if (!rooms.has(roomId)) { ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'room not found' })); return; }
  const room = rooms.get(roomId);
  if (!room.disconnectedControllers.has(reconnectToken)) {
    ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'invalid or expired token' }));
    metrics.trackReconnect(false);
    return;
  }

  const dc = room.disconnectedControllers.get(reconnectToken);
  clearTimeout(dc.timer);
  const { playerIndex, playerName } = dc;
  ws.data = { role: 'controller', roomId, playerIndex };
  room.controllers.set(ws, { playerIndex, playerName, reconnectToken });
  room.disconnectedControllers.delete(reconnectToken);
  room.players = getPlayersList(room);
  metrics.trackReconnect(true);

  ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECTED, playerIndex, playerName, roomId, players: room.players }));
  sendToScreen(room, { event: 'player_reconnected', playerIndex, playerName, playerCount: room.controllers.size });
  log.info('reconnected', { wsId: ws.id, roomId, playerIndex, playerName });
}

// ========== Utilities ==========
function sendError(ws, msg) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: 'error', message: msg })); }
function getServerHost() { return process.env.SERVER_HOST || 'localhost:3000'; }

// ========== Startup ==========
const PORT = process.env.PORT || 3000;

// Inject room count for metrics
metrics.setRoomCountFn(() => rooms.size);

server.listen(PORT, () => {
  log.info('startup', { port: PORT, version: '0.3.0' });
  console.log(['',
    '🎮 PartyGameSDK v0.3.0',
    `📡 http://localhost:${PORT}`,
    `📊 Metrics: http://localhost:${PORT}/__metrics`,
    `💚 Health:  http://localhost:${PORT}/__health`,
    `📺 Screen:   http://localhost:${PORT}/screen`,
    `🎮 Ctrl:     http://localhost:${PORT}/controller`,
    '',
  ].join('\n'));
});

