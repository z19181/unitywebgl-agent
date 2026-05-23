// server/metrics/index.js — v0.3.0 Room + WS Metrics
// Exposed at GET /__metrics (Prometheus text format)
// Internal: metrics.collect() returns JSON for logging/other consumers

const state = {
  roomsCreated: 0,
  roomsDestroyed: 0,
  wsConnections: 0,
  wsDisconnections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: {},
  reconnectAttempts: 0,
  reconnectSuccesses: 0,
  // rate tracking
  msgRate: { lastMinute: [], lastCheck: Date.now() },
};

function increment(key, n = 1) {
  if (typeof state[key] === 'number') state[key] += n;
}

function trackError(code) {
  state.errors[code] = (state.errors[code] || 0) + 1;
}

function trackReconnect(success) {
  state.reconnectAttempts++;
  if (success) state.reconnectSuccesses++;
}

function trackMessage() {
  state.messagesReceived++;
  state.msgRate.lastMinute.push(Date.now());
}

// Active room count injected by server.js at startup
let _getActiveRoomCount = () => 0;
function setRoomCountFn(fn) { _getActiveRoomCount = fn; }
function getActiveRooms() { return _getActiveRoomCount(); }

/**
 * Prometheus text format
 */
function prometheusText() {
  const now = Date.now();
  // clean rate buffer
  state.msgRate.lastMinute = state.msgRate.lastMinute.filter(t => now - t < 60000);
  const rate = state.msgRate.lastMinute.length;

  const activeRooms = getActiveRooms();

  return [
    '# HELP partygame_rooms_active Active rooms',
    '# TYPE partygame_rooms_active gauge',
    `partygame_rooms_active ${activeRooms}`,
    '# HELP partygame_rooms_created_total Total rooms created',
    '# TYPE partygame_rooms_created_total counter',
    `partygame_rooms_created_total ${state.roomsCreated}`,
    '# HELP partygame_rooms_destroyed_total Total rooms destroyed',
    '# TYPE partygame_rooms_destroyed_total counter',
    `partygame_rooms_destroyed_total ${state.roomsDestroyed}`,
    '# HELP partygame_ws_connections Current WebSocket connections',
    '# TYPE partygame_ws_connections gauge',
    `partygame_ws_connections ${state.wsConnections}`,
    '# HELP partygame_messages_received_total Total messages received',
    '# TYPE partygame_messages_received_total counter',
    `partygame_messages_received_total ${state.messagesReceived}`,
    '# HELP partygame_messages_rate_per_minute Messages per minute (approx)',
    '# TYPE partygame_messages_rate_per_minute gauge',
    `partygame_messages_rate_per_minute ${rate}`,
    '# HELP partygame_reconnect_attempts_total Total reconnect attempts',
    '# TYPE partygame_reconnect_attempts_total counter',
    `partygame_reconnect_attempts_total ${state.reconnectAttempts}`,
    '# HELP partygame_reconnect_successes_total Total successful reconnects',
    '# TYPE partygame_reconnect_successes_total counter',
    `partygame_reconnect_successes_total ${state.reconnectSuccesses}`,
    ...Object.entries(state.errors).map(([code, count]) =>
      `# HELP partygame_errors_total Errors by code\n# TYPE partygame_errors_total counter\npartygame_errors_total{code="${code}"} ${count}`
    ),
    '',
  ].join('\n');
}

/**
 * JSON summary (for logging / health check)
 */
function jsonSummary() {
  return {
    activeRooms: getActiveRooms(),
    totalRoomsCreated: state.roomsCreated,
    totalRoomsDestroyed: state.roomsDestroyed,
    activeConnections: state.wsConnections,
    totalMessages: state.messagesReceived,
    msgRatePerMinute: state.msgRate.lastMinute.length,
    reconnects: { attempts: state.reconnectAttempts, successes: state.reconnectSuccesses },
    errors: { ...state.errors },
  };
}

module.exports = { state, increment, trackError, trackReconnect, trackMessage, prometheusText, jsonSummary, setRoomCountFn };
