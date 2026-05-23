const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ========== 配置 ==========
const CONFIG = {
  MAX_PLAYERS: 8,            // 每个房间最大玩家数
  RECONNECT_TIMEOUT: 30000,   // 重连令牌有效时间 30s
  ROOM_DESTROY_DELAY: 10000,  // screen 断开后房间销毁延迟 10s
  HEARTBEAT_INTERVAL: 30000, // 心跳间隔 30s
  PLAYER_INACTIVE_TIMEOUT: 120000, // 玩家无操作超时 120s
};

// ========== 静态文件服务 ==========
app.use('/screen', express.static(__dirname + '/../screen'));
app.use('/controller', express.static(__dirname + '/../controller'));
app.use('/templates/quiz', express.static(__dirname + '/../templates/quiz-game'));
app.use('/templates/unity', express.static(__dirname + '/../templates/unity-webgl'));

// ========== 数据模型 ==========
const rooms = new Map();         // roomId -> roomObject
const reconnectTokens = new Map(); // token -> { roomId, playerIndex, playerName, expiresAt }

// ========== 消息类型常量 ==========
const MSG_TYPE = {
  CREATE_ROOM: 'create_room',
  ROOM_CREATED: 'room_created',
  JOIN_ROOM: 'join_room',
  REJOIN_ROOM: 'rejoin_room',
  ROOM_JOINED: 'room_joined',
  ROOM_NOT_FOUND: 'room_not_FOUND',
  ROOM_DESTROYED: 'room_destroyed',
  ROOM_DESTROY_COUNTDOWN: 'room_destroy_countdown',
  ROOM_DESTROY_CANCELLED: 'room_destroy_cancelled',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_REJECTED: 'player_rejected',
  GAME_MESSAGE: 'game_message',
  BROADCAST: 'broadcast',
  SCREEN_READY: 'screen_ready',
  DESTROY_ROOM: 'destroy_room',
  PING: 'ping',
  PONG: 'pong',
};

// ========== WebSocket 连接处理 ==========
wss.on('connection', (ws, req) => {
  ws.id = uuidv4();
  ws.data = {};
  ws.isAlive = true;
  ws.lastActivity = Date.now();

  console.log(`[${ts()}] Client connected: ${ws.id}`);

  ws.on('message', (data) => {
    ws.lastActivity = Date.now();
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error(`[${ws.id}] Invalid message:`, error);
      sendError(ws, 'Invalid JSON');
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// ========== 心跳检测 ==========
const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, CONFIG.HEARTBEAT_INTERVAL);

server.on('close', () => clearInterval(heartbeat));

// ========== 消息路由 ==========
function handleMessage(ws, message) {
  const eventType = message.event || message.type;
  console.log(`[${ws.id}] ${eventType}:`, JSON.stringify(message).substring(0, 200));

  switch (eventType) {
    case MSG_TYPE.CREATE_ROOM:
      handleCreateRoom(ws, message);
      break;
    case MSG_TYPE.JOIN_ROOM:
      handleJoinRoom(ws, message);
      break;
    case MSG_TYPE.REJOIN_ROOM:
      handleRejoinRoom(ws, message);
      break;
    case MSG_TYPE.GAME_MESSAGE:
      handleGameMessage(ws, message);
      break;
    case MSG_TYPE.BROADCAST:
      handleBroadcast(ws, message);
      break;
    case MSG_TYPE.DESTROY_ROOM:
      handleDestroyRoom(ws, message);
      break;
    case MSG_TYPE.SCREEN_READY:
      handleScreenReady(ws);
      break;
    case MSG_TYPE.PING:
      ws.send(JSON.stringify({ event: MSG_TYPE.PONG }));
      break;
    default:
      console.warn(`[${ws.id}] Unknown message type: ${eventType}`);
  }
}

// ========== 房间管理 ==========

function handleCreateRoom(ws, message) {
  if (ws.data.role === 'screen') {
    sendError(ws, 'Screen already in a room');
    return;
  }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const room = {
    roomId,
    screenSocket: ws,
    controllers: new Map(),
    nextPlayerIndex: 0,
    maxPlayers: message.maxPlayers || CONFIG.MAX_PLAYERS,
    createdAt: Date.now(),
    destroyTimer: null,
  };

  rooms.set(roomId, room);
  ws.data = { role: 'screen', roomId };

  const host = getServerHost();
  const controllerUrl = `http://${host}/controller?room=${roomId}`;
  const qrUrl = `/api/qr?data=${encodeURIComponent(controllerUrl)}&size=200`;

  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_CREATED,
    roomId,
    controllerUrl,
    qrUrl,
    maxPlayers: room.maxPlayers,
  }));

  console.log(`[${ws.id}] Room created: ${roomId} (max ${room.maxPlayers} players)`);
}

function getServerHost() {
  return process.env.HOST || `localhost:${PORT}`;
}

// ========== 加入房间 ==========

function handleJoinRoom(ws, message) {
  const { roomId, playerName } = message;

  if (!roomId || !rooms.has(roomId)) {
    ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_NOT_FOUND, roomId }));
    return;
  }

  const room = rooms.get(roomId);

  // 最大人数检查
  if (room.controllers.size >= room.maxPlayers) {
    ws.send(JSON.stringify({
      event: MSG_TYPE.PLAYER_REJECTED,
      reason: `Room is full (${room.maxPlayers} players max)`,
    }));
    return;
  }

  // 分配 playerIndex
  const playerIndex = room.nextPlayerIndex++;
  const name = playerName || `Player ${playerIndex}`;

  ws.data = { role: 'controller', roomId, playerIndex, playerName: name };
  room.controllers.set(ws, { playerIndex, playerName: name });

  // 生成重连令牌
  const reconnectToken = crypto.randomBytes(16).toString('hex');
  reconnectTokens.set(reconnectToken, {
    roomId,
    playerIndex,
    playerName: name,
    expiresAt: Date.now() + CONFIG.RECONNECT_TIMEOUT,
  });

  // 通知 controller
  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_JOINED,
    roomId,
    playerIndex,
    playerName: name,
    playerCount: room.controllers.size,
    reconnectToken,
    maxPlayers: room.maxPlayers,
  }));

  // 通知 screen
  notifyScreen(room, {
    event: MSG_TYPE.PLAYER_JOINED,
    playerIndex,
    playerName: name,
    playerCount: room.controllers.size,
    maxPlayers: room.maxPlayers,
  });

  // 取消房间销毁计时器（如果有的话）
  cancelRoomDestroyTimer(room);

  console.log(`[${ws.id}] Player ${playerIndex} ("${name}") joined room ${roomId}`);
}

// ========== 断线重连 ==========

function handleRejoinRoom(ws, message) {
  const { reconnectToken } = message;

  if (!reconnectToken || !reconnectTokens.has(reconnectToken)) {
    ws.send(JSON.stringify({
      event: MSG_TYPE.PLAYER_REJECTED,
      reason: 'Invalid or expired reconnect token',
    }));
    return;
  }

  const token = reconnectTokens.get(reconnectToken);

  // 检查令牌是否过期
  if (Date.now() > token.expiresAt) {
    reconnectTokens.delete(reconnectToken);
    ws.send(JSON.stringify({
      event: MSG_TYPE.PLAYER_REJECTED,
      reason: 'Reconnect token expired',
    }));
    return;
  }

  // 检查房间是否还存在
  if (!rooms.has(token.roomId)) {
    reconnectTokens.delete(reconnectToken);
    ws.send(JSON.stringify({
      event: MSG_TYPE.PLAYER_REJECTED,
      reason: 'Room no longer exists',
    }));
    return;
  }

  const room = rooms.get(token.roomId);

  // 删除旧令牌，生成新令牌
  reconnectTokens.delete(reconnectToken);
  const newToken = crypto.randomBytes(16).toString('hex');
  reconnectTokens.set(newToken, {
    roomId: token.roomId,
    playerIndex: token.playerIndex,
    playerName: token.playerName,
    expiresAt: Date.now() + CONFIG.RECONNECT_TIMEOUT,
  });

  // 恢复连接
  ws.data = {
    role: 'controller',
    roomId: token.roomId,
    playerIndex: token.playerIndex,
    playerName: token.playerName,
  };
  room.controllers.set(ws, {
    playerIndex: token.playerIndex,
    playerName: token.playerName,
  });

  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_JOINED,
    roomId: token.roomId,
    playerIndex: token.playerIndex,
    playerName: token.playerName,
    playerCount: room.controllers.size,
    reconnectToken: newToken,
    maxPlayers: room.maxPlayers,
    rejoined: true,
  }));

  // 通知 screen
  notifyScreen(room, {
    event: MSG_TYPE.PLAYER_JOINED,
    playerIndex: token.playerIndex,
    playerName: token.playerName,
    playerCount: room.controllers.size,
    maxPlayers: room.maxPlayers,
    rejoined: true,
  });

  // 取消房间销毁计时器
  cancelRoomDestroyTimer(room);

  console.log(`[${ws.id}] Player ${token.playerIndex} rejoined room ${token.roomId}`);
}

// ========== 游戏消息处理 ==========

function handleGameMessage(ws, message) {
  if (ws.data.role !== 'controller') {
    sendError(ws, 'Only controllers can send game_message');
    return;
  }

  const { roomId, playerIndex } = ws.data;
  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Not in a room');
    return;
  }

  const room = rooms.get(roomId);

  // 安全：删除客户端伪造的 playerIndex
  if (message.playerIndex !== undefined) {
    console.warn(`[${ws.id}] Controller tried to send playerIndex:${message.playerIndex}, ignoring`);
    delete message.playerIndex;
  }

  // 注入真实的 playerIndex
  message.playerIndex = playerIndex;

  // 转发给 screen/Unity
  notifyScreen(room, message);
  console.log(`[${ws.id}] Forwarded game_message to screen: ${message.type}`);
}

// ========== 广播消息处理 ==========

function handleBroadcast(ws, message) {
  if (ws.data.role !== 'screen') {
    sendError(ws, 'Only screen can send broadcasts');
    return;
  }

  const { roomId } = ws.data;
  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Room not found');
    return;
  }

  const room = rooms.get(roomId);
  let count = 0;

  room.controllers.forEach((info, controllerWs) => {
    if (controllerWs.readyState === WebSocket.OPEN) {
      controllerWs.send(JSON.stringify(message));
      count++;
    }
  });

  console.log(`[Server] Broadcast to ${count} controllers in room ${roomId}: ${message.type}`);
}

// ========== 房间销毁 ==========

function handleDestroyRoom(ws, message) {
  const { roomId } = ws.data;
  if (ws.data.role !== 'screen' || !roomId || !rooms.has(roomId)) {
    sendError(ws, 'Only screen can destroy room');
    return;
  }

  destroyRoom(roomId, 'screen requested');
}

function scheduleRoomDestroy(room) {
  if (room.destroyTimer) return;

  const delay = CONFIG.ROOM_DESTROY_DELAY;
  const remaining = delay / 1000;

  // 通知所有客户端倒计时
  notifyScreen(room, {
    event: MSG_TYPE.ROOM_DESTROY_COUNTDOWN,
    roomId: room.roomId,
    seconds: remaining,
  });

  broadcastToControllers(room, {
    event: MSG_TYPE.ROOM_DESTROY_COUNTDOWN,
    roomId: room.roomId,
    seconds: remaining,
  });

  // 5秒时再提醒一次
  setTimeout(() => {
    if (rooms.has(room.roomId) && room.screenSocket !== ws_placeholder()) {
      notifyScreen(room, {
        event: MSG_TYPE.ROOM_DESTROY_COUNTDOWN,
        roomId: room.roomId,
        seconds: 5,
      });
      broadcastToControllers(room, {
        event: MSG_TYPE.ROOM_DESTROY_COUNTDOWN,
        roomId: room.roomId,
        seconds: 5,
      });
    }
  }, delay - 5000);

  room.destroyTimer = setTimeout(() => {
    destroyRoom(room.roomId, 'screen disconnected timeout');
  }, delay);

  console.log(`Room ${room.roomId} will be destroyed in ${remaining}s`);
}

function cancelRoomDestroyTimer(room) {
  if (room.destroyTimer) {
    clearTimeout(room.destroyTimer);
    room.destroyTimer = null;
    console.log(`Room ${room.roomId} destroy timer cancelled`);
  }
}

function destroyRoom(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room) return;

  rooms.delete(roomId);

  // 清理重连令牌
  for (const [token, data] of reconnectTokens) {
    if (data.roomId === roomId) reconnectTokens.delete(token);
  }

  // 通知所有 controllers
  broadcastToControllers(room, {
    event: MSG_TYPE.ROOM_DESTROYED,
    roomId,
    reason,
  });

  console.log(`[${ts()}] Room ${roomId} destroyed: ${reason}`);
}

// ========== 断开连接处理 ==========

function handleDisconnect(ws) {
  const { role, roomId, playerIndex } = ws.data;
  console.log(`[${ws.id}] Client disconnected (role: ${role}, room: ${roomId})`);

  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId);

  if (role === 'screen') {
    room.screenSocket = null;

    // 如果还有玩家，延迟销毁；否则立即销毁
    if (room.controllers.size > 0) {
      scheduleRoomDestroy(room);
    } else {
      destroyRoom(roomId, 'screen disconnected');
    }

  } else if (role === 'controller') {
    room.controllers.delete(ws);

    notifyScreen(room, {
      event: MSG_TYPE.PLAYER_LEFT,
      playerIndex,
      playerCount: room.controllers.size,
    });

    // 如果没有玩家了，检查是否需要销毁
    if (room.controllers.size === 0 && !room.screenSocket) {
      destroyRoom(roomId, 'no players left');
    }

    console.log(`[${ws.id}] Player ${playerIndex} left room ${roomId}`);
  }
}

// ========== 工具函数 ==========

function notifyScreen(room, message) {
  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify(message));
  }
}

function broadcastToControllers(room, message) {
  room.controllers.forEach((info, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function sendError(ws, errorMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'error', message: errorMsg }));
  }
}

function ts() {
  return new Date().toISOString().split('T')[1].split('.')[0];
}

function ws_placeholder() { return null; }

// ========== 清理过期重连令牌 ==========
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of reconnectTokens) {
    if (now > data.expiresAt) {
      reconnectTokens.delete(token);
    }
  }
}, 60000);

// ========== 二维码 API ==========
app.get('/api/qr', (req, res) => {
  const { data, size = 200 } = req.query;
  if (!data) {
    return res.status(400).json({ error: 'missing data param' });
  }
  // 使用 Google Charts QR API（无需额外依赖）
  res.redirect(`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=ffffff&color=333333`);
});

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 Party Game SDK v0.2 Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`📺 Screen:  http://localhost:${PORT}/screen`);
  console.log(`🎮 Controller: http://localhost:${PORT}/controller`);
  console.log(`👥 Max players per room: ${CONFIG.MAX_PLAYERS}`);
  console.log(`🔄 Reconnect timeout: ${CONFIG.RECONNECT_TIMEOUT / 1000}s`);
  console.log(`💣 Room destroy delay: ${CONFIG.ROOM_DESTROY_DELAY / 1000}s\n`);
});
