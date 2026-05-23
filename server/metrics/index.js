// server/metrics/index.js — v0.3.3 Enhanced Room + WS Metrics
// Exposed at GET /__metrics (Prometheus text format)

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
  // v0.3.3: Per-type message tracking
  msgByType: {},
  msgByEvent: {},
  // v0.3.3: Event latency (simple average)
  eventDurations: {},
  eventDurationCounts: {},
  // v0.3.3: Controller/player counts injected by server
  controllersActive: 0,
  playersActive: 0,
  // rate tracking
  msgRate: { lastMinute: [], lastCheck: Date.now() },
};

function increment(key, n = 1) {
  if (typeof state[key] === 'number') state[key] += n;
  if (key === 'controllersActive') state.playersActive = Math.min(state.playersActive, state.controllersActive);
}

function trackError(code) { state.errors[code] = (state.errors[code] || 0) + 1; }

function trackReconnect(success) {
  state.reconnectAttempts++;
  if (success) state.reconnectSuccesses++;
}

function trackMessage(eventType, msgType) {
  state.messagesReceived++;
  state.msgRate.lastMinute.push(Date.now());
  if (eventType) state.msgByEvent[eventType] = (state.msgByEvent[eventType] || 0) + 1;
  if (msgType) state.msgByType[msgType] = (state.msgByType[msgType] || 0) + 1;
}

function trackEventDuration(event, ms) {
  if (!state.eventDurations[event]) { state.eventDurations[event] = 0; state.eventDurationCounts[event] = 0; }
  state.eventDurations[event] += ms;
  state.eventDurationCounts[event]++;
}

let _getActiveRoomCount = () => 0;
function setRoomCountFn(fn) { _getActiveRoomCount = fn; }
function getActiveRooms() { return _getActiveRoomCount(); }

function prometheusText() {
  const now = Date.now();
  state.msgRate.lastMinute = state.msgRate.lastMinute.filter(t => now - t < 60000);
  const rate = state.msgRate.lastMinute.length;
  const activeRooms = getActiveRooms();

  const lines = [
    `# HELP partygame_info Server information`,
    `# TYPE partygame_info gauge`,
    `partygame_info{version="0.3.3"} 1`,
    `# HELP partygame_uptime_seconds Server uptime`,
    `# TYPE partygame_uptime_seconds gauge`,
    `partygame_uptime_seconds ${Math.floor(process.uptime())}`,
    '',
    `# HELP partygame_rooms_active Active rooms`,
    `# TYPE partygame_rooms_active gauge`,
    `partygame_rooms_active ${activeRooms}`,
    `# HELP partygame_rooms_created_total Total rooms created`,
    `# TYPE partygame_rooms_created_total counter`,
    `partygame_rooms_created_total ${state.roomsCreated}`,
    `# HELP partygame_rooms_destroyed_total Total rooms destroyed`,
    `# TYPE partygame_rooms_destroyed_total counter`,
    `partygame_rooms_destroyed_total ${state.roomsDestroyed}`,
    '',
    `# HELP partygame_ws_connections_active Active WebSocket connections`,
    `# TYPE partygame_ws_connections_active gauge`,
    `partygame_ws_connections_active ${state.wsConnections}`,
    `# HELP partygame_controllers_active Active controllers`,
    `# TYPE partygame_controllers_active gauge`,
    `partygame_controllers_active ${state.controllersActive}`,
    '',
    `# HELP partygame_messages_received_total Total messages received`,
    `# TYPE partygame_messages_received_total counter`,
    `partygame_messages_received_total ${state.messagesReceived}`,
    `# HELP partygame_messages_sent_total Total messages sent`,
    `# TYPE partygame_messages_sent_total counter`,
    `partygame_messages_sent_total ${state.messagesSent}`,
    `# HELP partygame_messages_rate_per_minute Messages per minute (approx)`,
    `# TYPE partygame_messages_rate_per_minute gauge`,
    `partygame_messages_rate_per_minute ${rate}`,
  ];

  // Per-type message counts
  for (const [t, c] of Object.entries(state.msgByType)) {
    lines.push(`# HELP partygame_messages_by_type Messages by message type`, `# TYPE partygame_messages_by_type counter`);
    lines.push(`partygame_messages_by_type{type="${t}"} ${c}`);
  }
  for (const [e, c] of Object.entries(state.msgByEvent)) {
    lines.push(`# HELP partygame_messages_by_event Messages by event type`, `# TYPE partygame_messages_by_event counter`);
    lines.push(`partygame_messages_by_event{event="${e}"} ${c}`);
  }

  lines.push('');

  // Error counts
  for (const [code, count] of Object.entries(state.errors)) {
    lines.push(`# HELP partygame_errors_total Errors by code`, `# TYPE partygame_errors_total counter`);
    lines.push(`partygame_errors_total{code="${code}"} ${count}`);
  }

  // Reconnect
  lines.push('', `# HELP partygame_reconnect_attempts_total Total reconnect attempts`, `# TYPE partygame_reconnect_attempts_total counter`, `partygame_reconnect_attempts_total ${state.reconnectAttempts}`);
  lines.push(`# HELP partygame_reconnect_successes_total Total successful reconnects`, `# TYPE partygame_reconnect_successes_total counter`, `partygame_reconnect_successes_total ${state.reconnectSuccesses}`);

  // Event durations
  for (const [event, totalMs] of Object.entries(state.eventDurations)) {
    const count = state.eventDurationCounts[event] || 1;
    const avg = totalMs / count;
    lines.push(`# HELP partygame_event_duration_ms_avg Average event processing time`, `# TYPE partygame_event_duration_ms_avg gauge`);
    lines.push(`partygame_event_duration_ms_avg{event="${event}"} ${avg.toFixed(2)}`);
  }

  lines.push('');
  return lines.join('\n');
}

function jsonSummary() {
  return {
    activeRooms: getActiveRooms(),
    totalRoomsCreated: state.roomsCreated,
    totalRoomsDestroyed: state.roomsDestroyed,
    activeConnections: state.wsConnections,
    activeControllers: state.controllersActive,
    totalMessages: state.messagesReceived,
    msgRatePerMinute: state.msgRate.lastMinute.length,
    reconnects: { attempts: state.reconnectAttempts, successes: state.reconnectSuccesses },
    errors: { ...state.errors },
    byType: { ...state.msgByType },
    byEvent: { ...state.msgByEvent },
  };
}

module.exports = { state, increment, trackError, trackReconnect, trackMessage, trackEventDuration, prometheusText, jsonSummary, setRoomCountFn };
