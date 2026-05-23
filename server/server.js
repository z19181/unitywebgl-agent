const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ========== 静态文件服务 ==========
app.use('/screen', express.static(__dirname + '/../screen'));
app.use('/controller', express.static(__dirname + '/../controller'));

// ========== 数据模型 ==========

/**
 * 房间结构:
 * {
 *   roomId: string,
 *   screenSocket: WebSocket | null,
 *   controllers: Map<WebSocket, { playerIndex, playerName, reconnectToken?, disconnected? }>,
 *   disconnectedControllers: Map<string, { ws, playerIndex, playerName, timer }>,  // v0.2.3: 断开等待重连
 *   players: [{ playerIndex, playerName }],  // v0.2.2: 有序玩家列表
 *   nextPlayerIndex: number,
 *   maxPlayers: number,                      // v0.2.2: 最大玩家数
 *   reconnectSecret: string                  // v0.2.3: 房间重连密钥
 * }
 */
const rooms = new Map(); // roomId -> roomObject

// v0.2.3: 重连等待时间（毫秒）
const RECONNECT_TIMEOUT = 10 * 1000;  // 10秒

// ========== 消息类型常量 ==========
const MSG_TYPE = {
  // 房间管理
  CREATE_ROOM: 'create_room',
  ROOM_CREATED: 'room_created',
  JOIN_ROOM: 'join_room',
  ROOM_JOINED: 'room_joined',
  ROOM_NOT_FOUND: 'room_not_found',
  ROOM_FULL: 'room_full',          // v0.2.2

  // 控制器管理
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYERS_CHANGED: 'players.changed', // v0.2.2
  PLAYER_REJECTED: 'player_rejected',

  // v0.2.3 重连
  RECONNECT: 'reconnect',
  RECONNECTED: 'reconnected',
  RECONNECT_FAILED: 'reconnect_failed',

  // 游戏消息
  GAME_MESSAGE: 'game_message',
  BROADCAST: 'broadcast',

  // 系统
  SCREEN_READY: 'screen_ready',

  // v0.2.1 房间管理
  CLOSE_ROOM: 'close_room',
  ROOM_CLOSED: 'room_closed'
};

// ========== WebSocket 连接处理 ==========
wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.data = {}; // 存储角色信息:{ role, roomId, playerIndex }

  console.log(`[${new Date().toISOString()}] Client connected: ${ws.id}`);

  ws.on('message', (data) => {
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
});

// ========== 消息路由 ==========
function handleMessage(ws, message) {
  const eventType = message.event || message.type; // 兼容两种格式
  console.log(`[${ws.id}] ${eventType}:`, JSON.stringify(message));

  switch (eventType) {
    case MSG_TYPE.CREATE_ROOM:
      handleCreateRoom(ws, message);
      break;

    case MSG_TYPE.JOIN_ROOM:
      handleJoinRoom(ws, message);
      break;

    case MSG_TYPE.CLOSE_ROOM:
      handleCloseRoom(ws);
      break;

    case MSG_TYPE.GAME_MESSAGE:
      handleGameMessage(ws, message);
      break;

    case MSG_TYPE.BROADCAST:
      handleBroadcast(ws, message);
      break;

    case MSG_TYPE.SCREEN_READY:
      handleScreenReady(ws);
      break;

    case MSG_TYPE.RECONNECT:
      handleReconnect(ws, message);
      break;

    default:
      console.warn(`[${ws.id}] Unknown message type: ${eventType}`);
  }
}

// ========== 辅助函数 ==========

/**
 * 获取房间内所有玩家的列表（有序）
 */
function getPlayersList(room) {
  return Array.from(room.controllers.values()).map(info => ({
    playerIndex: info.playerIndex,
    playerName: info.playerName
  }));
}

/**
 * 向所有 controllers 广播消息
 */
function broadcastToControllers(room, message) {
  let count = 0;
  room.controllers.forEach((info, controllerWs) => {
    if (controllerWs.readyState === WebSocket.OPEN) {
      controllerWs.send(JSON.stringify(message));
      count++;
    }
  });
  return count;
}

/**
 * 向 screen 发送消息（带校验）
 */
function sendToScreen(room, message) {
  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    try {
      room.screenSocket.send(JSON.stringify(message));
    } catch(e) {
      console.error(`Failed to send to screen: ${e.message}`);
    }
  }
}

// ========== 房间管理 ==========

/**
 * 1. screen 发送 create_room（支持 maxPlayers）
 * 2. server 创建 roomId
 * 3. server 保存 room（带 maxPlayers）
 * 4. server 返回 room_created
 */
function handleCreateRoom(ws, message) {
  if (ws.data.role === 'screen') {
    sendError(ws, 'Screen already in a room');
    return;
  }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  const maxPlayers = Math.max(1, Math.min(parseInt(message.maxPlayers) || 4, 16)); // 1~16

  const room = {
    roomId,
    screenSocket: ws,
    controllers: new Map(),   // ws → { playerIndex, playerName }
    disconnectedControllers: new Map(),  // v0.2.3: token → { ws, playerIndex, playerName, timer }
    players: [],              // v0.2.2: 有序列表
    nextPlayerIndex: 0,
    maxPlayers,               // v0.2.2
    reconnectSecret: crypto.randomBytes(16).toString('hex')  // v0.2.3
  };

  rooms.set(roomId, room);

  ws.data = {
    role: 'screen',
    roomId
  };

  const qrUrl = `http://${getServerHost()}/controller?room=${roomId}`;

  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_CREATED,
    roomId,
    qrUrl,
    maxPlayers,  // v0.2.2: 返回 maxPlayers
    reconnectSecret: room.reconnectSecret  // v0.2.3: 房间重连密钥（仅 screen 可见）
  }));

  console.log(`[${ws.id}] Room created: ${roomId} (maxPlayers=${maxPlayers})`);
}

/**
 * 5. controller 发送 join_room
 * 6. server 校验 roomId 是否存在
 * 6b. server 校验是否满员 → room_full
 * 7. server 为 controller 分配 playerIndex
 * 8. server 将信息写入 socket.data
 * 9. server 通知 controller: room_joined（带 players 列表）
 * 10. server 通知 screen: player_joined + players.changed
 * 10b. server 通知其他 controllers: players.changed
 */
function handleJoinRoom(ws, message) {
  const { roomId } = message;

  if (!roomId || !rooms.has(roomId)) {
    ws.send(JSON.stringify({ event: MSG_TYPE.ROOM_NOT_FOUND, roomId }));
    console.warn(`[${ws.id}] Room not found: ${roomId}`);
    return;
  }

  const room = rooms.get(roomId);

  if (ws.data.role === 'controller' && ws.data.roomId === roomId) {
    sendError(ws, 'Already joined this room');
    return;
  }

  // v0.2.2: 检查是否满员
  if (room.controllers.size >= room.maxPlayers) {
    ws.send(JSON.stringify({
      event: MSG_TYPE.ROOM_FULL,
      roomId,
      maxPlayers: room.maxPlayers
    }));
    console.warn(`[${ws.id}] Room full: ${roomId} (${room.controllers.size}/${room.maxPlayers})`);
    return;
  }

  const playerIndex = room.nextPlayerIndex++;
  const playerName = message.playerName || `Player ${playerIndex}`;
  const reconnectToken = crypto.randomBytes(16).toString('hex');  // v0.2.3

  ws.data = {
    role: 'controller',
    roomId,
    playerIndex
  };

  room.controllers.set(ws, { playerIndex, playerName, reconnectToken });
  room.players = getPlayersList(room);

  // 通知 controller
  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_JOINED,
    roomId,
    playerIndex,
    playerName,
    maxPlayers: room.maxPlayers,
    players: room.players,  // v0.2.2: 带上当前玩家列表
    reconnectToken          // v0.2.3: 重连令牌
  }));

  // 通知 screen: player_joined
  sendToScreen(room, {
    event: MSG_TYPE.PLAYER_JOINED,
    playerIndex,
    playerName,
    playerCount: room.controllers.size,
    players: room.players  // v0.2.2
  });

  // v0.2.2: 通知所有 controllers（含新加入的）: players.changed
  broadcastToControllers(room, {
    event: MSG_TYPE.PLAYERS_CHANGED,
    players: room.players
  });

  console.log(`[${ws.id}] Player ${playerIndex} (${playerName}) joined room ${roomId} [${room.controllers.size}/${room.maxPlayers}]`);
}

// ========== 游戏消息处理 ==========

/**
 * controller 发送 game_message:
 * - 忽略请求体中的 playerIndex
 * - 从 socket.data.playerIndex 读取真实 playerIndex
 * - 转发给 screen
 */
function handleGameMessage(ws, message) {
  if (ws.data.role !== 'controller') {
    sendError(ws, 'Only controllers can send game_message');
    return;
  }

  const { roomId, playerIndex } = ws.data;

  if (!roomId) {
    sendError(ws, 'Not in a room');
    return;
  }

  const room = rooms.get(roomId);
  if (!room) {
    sendError(ws, 'Room not found');
    return;
  }

  if (message.playerIndex !== undefined) {
    console.warn(`[${ws.id}] Controller tried to send playerIndex:${message.playerIndex}, ignoring`);
    delete message.playerIndex;
  }

  message.playerIndex = playerIndex;

  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify(message));
    console.log(`[${ws.id}] Forwarded game_message to screen: ${message.type} (PI=${playerIndex})`);
  } else {
    console.warn(`[${ws.id}] No screen in room ${roomId}`);
  }
}

// ========== 广播消息处理 ==========

/**
 * screen 发送 broadcast → 所有 controllers
 */
function handleBroadcast(ws, message) {
  if (ws.data.role !== 'screen') {
    sendError(ws, 'Only screen can send broadcasts');
    return;
  }

  console.log(`[Server] Broadcast from screen: ${message.type}`);

  const { roomId } = ws.data;

  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Room not found');
    return;
  }

  const room = rooms.get(roomId);
  const count = broadcastToControllers(room, message);
  console.log(`[Server] Broadcast to ${count} controllers in room ${roomId}`);
}

// ========== 屏幕就绪 ==========
function handleScreenReady(ws) {
  if (!ws.data.roomId) {
    handleCreateRoom(ws, {});
  }
}

// ========== 关闭房间 (v0.2.1) ==========

/**
 * screen 主动关闭房间
 */
function handleCloseRoom(ws) {
  if (ws.data.role !== 'screen') {
    sendError(ws, 'Only screen can close room');
    return;
  }

  const { roomId } = ws.data;
  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Room not found');
    return;
  }

  const room = rooms.get(roomId);
  console.log(`[${ws.id}] Screen closed room ${roomId}`);

  broadcastToControllers(room, {
    event: MSG_TYPE.ROOM_CLOSED,
    roomId,
    reason: 'host_closed'
  });

  rooms.delete(roomId);
}

// ========== 断开连接处理 ==========
function handleDisconnect(ws) {
  console.log(`[${ws.id}] Client disconnected (role: ${ws.data.role}, room: ${ws.data.roomId})`);

  const { role, roomId, playerIndex } = ws.data;

  if (!roomId || !rooms.has(roomId)) {
    return;
  }

  const room = rooms.get(roomId);

  if (role === 'screen') {
    // screen 断开：销毁房间 (v0.2.1)
    broadcastToControllers(room, {
      event: MSG_TYPE.ROOM_CLOSED,
      roomId,
      reason: 'host_disconnected'
    });
    rooms.delete(roomId);
    console.log(`[${ws.id}] Room ${roomId} closed (screen disconnected)`);

  } else if (role === 'controller') {
    // v0.2.3: 立即通知（让游戏逻辑及时响应），同时允许重连
    const controllerInfo = room.controllers.get(ws);
    if (controllerInfo) {
      // 先从 active controllers 删除
      room.controllers.delete(ws);
      room.players = getPlayersList(room);

      // 立即通知 screen: player_left
      sendToScreen(room, {
        event: MSG_TYPE.PLAYER_LEFT,
        playerIndex,
        playerCount: room.controllers.size,
        players: room.players
      });

      // 立即通知剩余 controllers: players.changed
      broadcastToControllers(room, {
        event: MSG_TYPE.PLAYERS_CHANGED,
        players: room.players
      });

      // 移动到 disconnectedControllers，启动重连倒计时
      const timer = setTimeout(() => {
        if (room.disconnectedControllers.has(controllerInfo.reconnectToken)) {
          room.disconnectedControllers.delete(controllerInfo.reconnectToken);
          console.log(`[${ws.id}] Player ${playerIndex} reconnect timeout, removed from room ${roomId}`);
        }
      }, RECONNECT_TIMEOUT);

      room.disconnectedControllers.set(controllerInfo.reconnectToken, {
        ws,
        playerIndex: controllerInfo.playerIndex,
        playerName: controllerInfo.playerName,
        reconnectToken: controllerInfo.reconnectToken,
        timer
      });

      console.log(`[${ws.id}] Player ${playerIndex} disconnected, waiting for reconnect (${RECONNECT_TIMEOUT}ms)`);
    }
  }
}

// ========== v0.2.3 重连处理 ==========

/**
 * Controller 发送 reconnect，尝试使用 reconnectToken 重连
 */
function handleReconnect(ws, message) {
  const { reconnectToken, roomId } = message;

  if (!reconnectToken || !roomId) {
    ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'missing token or roomId' }));
    return;
  }

  if (!rooms.has(roomId)) {
    ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'room not found' }));
    return;
  }

  const room = rooms.get(roomId);

  // 查找 disconnectedControllers
  if (!room.disconnectedControllers.has(reconnectToken)) {
    ws.send(JSON.stringify({ event: MSG_TYPE.RECONNECT_FAILED, reason: 'invalid or expired token' }));
    return;
  }

  const disconnectedInfo = room.disconnectedControllers.get(reconnectToken);

  // 取消倒计时
  clearTimeout(disconnectedInfo.timer);

  // 恢复连接
  const { playerIndex, playerName } = disconnectedInfo;

  ws.data = {
    role: 'controller',
    roomId,
    playerIndex
  };

  // 从 disconnectedControllers 移回 controllers
  room.controllers.set(ws, { playerIndex, playerName, reconnectToken });
  room.disconnectedControllers.delete(reconnectToken);
  room.players = getPlayersList(room);

  // 通知 controller: reconnected
  ws.send(JSON.stringify({
    event: MSG_TYPE.RECONNECTED,
    playerIndex,
    playerName,
    roomId,
    players: room.players
  }));

  // 通知 screen: player_reconnected (可选)
  sendToScreen(room, {
    event: 'player_reconnected',
    playerIndex,
    playerName,
    playerCount: room.controllers.size
  });

  console.log(`[${ws.id}] Player ${playerIndex} (${playerName}) reconnected to room ${roomId}`);
}

// ========== 工具函数 ==========
function sendError(ws, errorMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event: 'error', message: errorMsg }));
  }
}

function getServerHost() {
  return 'localhost:3000';
}

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 Party Game SDK v0.2.2 Server`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`📺 Screen: http://localhost:${PORT}/screen`);
  console.log(`🎮 Controller: http://localhost:${PORT}/controller\n`);
});
