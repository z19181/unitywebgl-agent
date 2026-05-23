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
 * 房间结构：
 * {
 *   roomId: string,
 *   screenSocket: WebSocket | null,
 *   controllers: Map<WebSocket, { playerIndex, playerName }>,
 *   nextPlayerIndex: number
 * }
 */
const rooms = new Map(); // roomId -> roomObject

// ========== 消息类型常量 ==========
const MSG_TYPE = {
  // 房间管理
  CREATE_ROOM: 'create_room',
  ROOM_CREATED: 'room_created',
  JOIN_ROOM: 'join_room',
  ROOM_JOINED: 'room_joined',
  ROOM_NOT_FOUND: 'room_not_found',
  CLOSE_ROOM: 'close_room',
  ROOM_CLOSED: 'room_closed',
  
  // 控制器管理
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_REJECTED: 'player_rejected',
  
  // 游戏消息
  GAME_MESSAGE: 'game_message',
  BROADCAST: 'broadcast',
  
  // 系统
  SCREEN_READY: 'screen_ready'
};

// ========== WebSocket 连接处理 ==========
wss.on('connection', (ws) => {
  ws.id = uuidv4();
  ws.data = {}; // 存储角色信息：{ role, roomId, playerIndex }
  
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
    // 房间管理
    case MSG_TYPE.CREATE_ROOM:
      handleCreateRoom(ws, message);
      break;
      
    case MSG_TYPE.CLOSE_ROOM:
      handleCloseRoom(ws, message);
      break;
      
    case MSG_TYPE.JOIN_ROOM:
      handleJoinRoom(ws, message);
      break;
      
    // 游戏消息（controller → server → screen/Unity）
    case MSG_TYPE.GAME_MESSAGE:
      handleGameMessage(ws, message);
      break;
      
    // 广播消息（Unity → server → controllers）
    case MSG_TYPE.BROADCAST:
      handleBroadcast(ws, message);
      break;
      
    // 屏幕就绪（旧协议兼容）
    case MSG_TYPE.SCREEN_READY:
      handleScreenReady(ws);
      break;
      
    default:
      console.warn(`[${ws.id}] Unknown message type: ${eventType}`);
  }
}

// ========== 房间管理 ==========

/**
 * 1. screen 发送 create_room
 * 2. server 创建 roomId
 * 3. server 保存 room
 * 4. server 返回 room_created
 */
function handleCreateRoom(ws, message) {
  // 验证：只能有一个 screen  per room（简化：一个 ws 只能创建一个房间）
  if (ws.data.role === 'screen') {
    sendError(ws, 'Screen already in a room');
    return;
  }
  
  // 生成 roomId（6位随机字符串）
  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  
  // 创建房间
  const room = {
    roomId,
    screenSocket: ws,
    controllers: new Map(),
    nextPlayerIndex: 0
  };
  
  rooms.set(roomId, room);
  
  // 标记 ws
  ws.data = {
    role: 'screen',
    roomId
  };
  
  // 生成 joinUrl（A.2 要求）
  const joinUrl = `http://${getServerHost()}/controller.html?roomId=${roomId}`;
  
  // 返回 room_created（A.1 要求：生成 joinUrl）
  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_CREATED,
    roomId,
    joinUrl
  }));
  
  console.log(`[${ws.id}] Room created: ${roomId}, joinUrl: ${joinUrl}`);
}

/**
 * 处理 screen 主动关闭房间（B.1 要求）
 */
function handleCloseRoom(ws, message) {
  // 验证：必须是 screen
  if (ws.data.role !== 'screen') {
    sendError(ws, 'Only screen can close room');
    return;
  }
  
  const { roomId } = ws.data;
  
  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Room not found');
    return;
  }
  
  // 广播 room_closed 给所有 controllers（B.3 要求）
  broadcastRoomClosed(roomId, 'host_closed');
  
  // 删除房间（B.5 要求）
  rooms.delete(roomId);
  
  console.log(`[${ws.id}] Room ${roomId} closed by host`);
}

/**
 * 广播 room_closed 事件（B.3 要求）
 */
function broadcastRoomClosed(roomId, reason) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const message = JSON.stringify({
    event: MSG_TYPE.ROOM_CLOSED,
    reason
  });
  
  // 通知所有 controllers
  room.controllers.forEach((info, controllerWs) => {
    if (controllerWs.readyState === WebSocket.OPEN) {
      controllerWs.send(message);
    }
  });
  
  console.log(`[Server] Broadcast room_closed to controllers: roomId=${roomId}, reason=${reason}`);
}

/**
 * 5. controller 发送 join_room
 * 6. server 校验 roomId 是否存在
 * 7. server 为 controller 分配 playerIndex
 * 8. server 将信息写入 socket.data
 * 9. server 通知 controller: room_joined
 * 10. server 通知 screen: player_joined
 */
function handleJoinRoom(ws, message) {
  const { roomId } = message;
  
  // 验证 roomId（B.6 要求：closed room 无法再次 join）
  if (!roomId || !rooms.has(roomId)) {
    ws.send(JSON.stringify({
      event: MSG_TYPE.ROOM_NOT_FOUND,
      roomId,
      reason: 'Room not found or already closed'
    }));
    console.warn(`[${ws.id}] Room not found: ${roomId}`);
    return;
  }
  
  const room = rooms.get(roomId);
  
  // 验证：不能重复加入
  if (ws.data.role === 'controller' && ws.data.roomId === roomId) {
    sendError(ws, 'Already joined this room');
    return;
  }
  
  // 分配 playerIndex
  const playerIndex = room.nextPlayerIndex++;
  const playerName = message.playerName || `Player ${playerIndex}`;
  
  // 写入 socket.data（第 8 条要求）
  ws.data = {
    role: 'controller',
    roomId,
    playerIndex
  };
  
  // 保存 controller
  room.controllers.set(ws, {
    playerIndex,
    playerName
  });
  
  // 通知 controller: room_joined（第 9 条要求）
  ws.send(JSON.stringify({
    event: MSG_TYPE.ROOM_JOINED,
    roomId,
    playerIndex,
    playerName
  }));
  
  // 通知 screen: player_joined（第 10 条要求）
  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify({
      event: MSG_TYPE.PLAYER_JOINED,
      playerIndex,
      playerName,
      playerCount: room.controllers.size
    }));
  }
  
  console.log(`[${ws.id}] Player ${playerIndex} joined room ${roomId}`);
}

// ========== 游戏消息处理 ==========

/**
 * 11. controller 发送 game_message 时：
 *   - 忽略请求体中的 playerIndex
 *   - 从 socket.data.playerIndex 读取真实 playerIndex
 *   - 转发给 screen
 */
function handleGameMessage(ws, message) {
  // 验证：必须是 controller
  if (ws.data.role !== 'controller') {
    sendError(ws, 'Only controllers can send game_message');
    return;
  }
  
  const { roomId, playerIndex } = ws.data;
  
  // 验证：必须有 roomId
  if (!roomId) {
    sendError(ws, 'Not in a room');
    return;
  }
  
  const room = rooms.get(roomId);
  if (!room) {
    sendError(ws, 'Room not found');
    return;
  }
  
  // 第 11 条要求：忽略请求体中的 playerIndex，使用 socket.data.playerIndex
  if (message.playerIndex !== undefined) {
    console.warn(`[${ws.id}] Controller tried to send playerIndex:${message.playerIndex}, ignoring`);
    delete message.playerIndex; // 删除客户端伪造的 playerIndex
  }
  
  // 注入真实的 playerIndex
  message.playerIndex = playerIndex;
  
  // 转发给 screen/Unity
  if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
    room.screenSocket.send(JSON.stringify(message));
    console.log(`[${ws.id}] Forwarded game_message to screen: ${message.type}`);
  } else {
    console.warn(`[${ws.id}] No screen in room ${roomId}`);
  }
}

// ========== 广播消息处理 ==========

/**
 * 12. screen 发送 broadcast 时：
 *   - 只允许 role = "screen" 的 socket 发起
 *   - 广播给该 room 下所有 controllers
 */
function handleBroadcast(ws, message) {
  // 验证：必须是 screen
  if (ws.data.role !== 'screen') {
    sendError(ws, 'Only screen can send broadcasts');
    return;
  }
  
  // 日志埋点：[Server] Broadcast to controllers
  console.log(`[Server] Received broadcast from screen: ${message.type}`);
  console.log(`[Server] ✓ Sender role is screen`);
  
  const { roomId } = ws.data;
  
  if (!roomId || !rooms.has(roomId)) {
    sendError(ws, 'Room not found');
    return;
  }
  
  const room = rooms.get(roomId);
  
  // 广播给所有 controllers
  let count = 0;
  room.controllers.forEach((info, controllerWs) => {
    if (controllerWs.readyState === WebSocket.OPEN) {
      controllerWs.send(JSON.stringify(message));
      count++;
    }
  });
  
  console.log(`[Server] Broadcast to controllers: ${count} controllers in room ${roomId}`);
}

// ========== 屏幕就绪（兼容旧协议） ==========
function handleScreenReady(ws) {
  // 如果没有 roomId，创建一个默认房间
  if (!ws.data.roomId) {
    handleCreateRoom(ws, {});
  }
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
    // screen 断开：自动销毁房间（B.2 要求）
    // 广播 room_closed（B.3 要求）
    broadcastRoomClosed(roomId, 'host_disconnected');
    
    // 删除房间（B.5 要求）
    rooms.delete(roomId);
    console.log(`[${ws.id}] Room ${roomId} destroyed (screen disconnected)`);
    
  } else if (role === 'controller') {
    // controller 断开：通知 screen
    room.controllers.delete(ws);
    
    if (room.screenSocket && room.screenSocket.readyState === WebSocket.OPEN) {
      room.screenSocket.send(JSON.stringify({
        event: MSG_TYPE.PLAYER_LEFT,
        playerIndex,
        playerCount: room.controllers.size
      }));
    }
    
    console.log(`[${ws.id}] Player ${playerIndex} left room ${roomId}`);
  }
}

// ========== 工具函数 ==========
function sendError(ws, errorMsg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      event: 'error',
      message: errorMsg
    }));
  }
}

function getServerHost() {
  // 从环境变量读取端口
  const port = process.env.PORT || 3000;
  return `localhost:${port}`;
}

// ========== 启动服务器 ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎮 Party Game SDK MVP Server (with Rooms)`);
  console.log(`📡 Running on http://localhost:${PORT}`);
  console.log(`📺 Screen: http://localhost:${PORT}/screen`);
  console.log(`🎮 Controller: http://localhost:${PORT}/controller\n`);
});
