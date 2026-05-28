// server/errors.js — v0.3.0 错误码体系
// 所有 server 端可观测错误统一编码

const ErrorCode = {
  // 连接层 (1xxx)
  CONN_INVALID_JSON:     { code: 1001, status: 400, msg: 'Invalid JSON' },
  CONN_UNKNOWN_MSG:      { code: 1002, status: 400, msg: 'Unknown message type' },
  CONN_DISCONNECTED:     { code: 1003, status: 410, msg: 'Client disconnected' },

  // 房间层 (2xxx)
  ROOM_NOT_FOUND:        { code: 2001, status: 404, msg: 'Room not found' },
  ROOM_FULL:             { code: 2002, status: 403, msg: 'Room is full' },
  ROOM_ALREADY_JOINED:   { code: 2003, status: 409, msg: 'Already joined this room' },
  ROOM_CLOSED_BY_HOST:   { code: 2004, status: 410, msg: 'Room closed by host' },
  ROOM_CLOSED_DISCONNECT:{ code: 2005, status: 410, msg: 'Host disconnected' },
  ROOM_INVALID_ID:       { code: 2006, status: 400, msg: 'Invalid room ID' },

  // 角色层 (3xxx)
  ROLE_NOT_CONTROLLER:   { code: 3001, status: 403, msg: 'Only controllers can send game_message' },
  ROLE_NOT_SCREEN:       { code: 3002, status: 403, msg: 'Only screen can broadcast' },
  ROLE_NOT_SCREEN_CLOSE: { code: 3003, status: 403, msg: 'Only screen can close room' },
  ROLE_ALREADY_SCREEN:   { code: 3004, status: 409, msg: 'Screen already in a room' },
  ROLE_NO_ROOM:          { code: 3005, status: 400, msg: 'Not in a room' },

  // 重连层 (4xxx)
  RECONN_MISSING_FIELDS: { code: 4001, status: 400, msg: 'Missing token or roomId' },
  RECONN_INVALID_TOKEN:  { code: 4002, status: 401, msg: 'Invalid or expired token' },
  RECONN_TOKEN_TIMEOUT:  { code: 4003, status: 410, msg: 'Reconnect timeout' },

  // 输入层 (5xxx)
  INPUT_FAKE_PLAYERINDEX:{ code: 5001, status: 400, msg: 'Controller sent playerIndex — ignored' },
  INPUT_NO_SCREEN:       { code: 5002, status: 503, msg: 'No screen connected to room' },
};

/**
 * Send a structured error to a WebSocket client
 */
function sendErrorCode(ws, errCode, extra = {}) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      event: 'error',
      ...errCode,
      ...extra,
      timestamp: new Date().toISOString(),
    }));
  }
  return errCode;
}

module.exports = { ErrorCode, sendErrorCode };
