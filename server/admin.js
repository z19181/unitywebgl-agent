// server/admin.js — v0.3.4 Admin API
//
// Mounted at /admin in server.js. All endpoints return { ok, data, error }.
// Auth: ADMIN_TOKEN env var → Bearer token.

const WebSocket = require('ws');

function createAdminRouter({ store, metrics, activeSockets, broadcastToControllers }) {
  const router = require('express').Router();

  // ── Auth middleware ──
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
  const isProduction = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  if (isProduction && !ADMIN_TOKEN) {
    throw new Error('ADMIN_TOKEN is required in production (NODE_ENV=production). Set ADMIN_TOKEN or disable production mode.');
  }

  if (!ADMIN_TOKEN) {
    console.warn('[admin] ⚠️  ADMIN_TOKEN not set — admin API is unprotected. Set ADMIN_TOKEN for production.');
  }

  function auth(req, res, next) {
    if (!ADMIN_TOKEN) return next(); // Unprotected dev mode
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or missing admin token' } });
    }
    next();
  }

  // ── Health ──
  const VERSION = process.env.APP_VERSION || 'dev';
  router.get('/health', (req, res) => {
    res.json({ ok: true, data: { status: 'ok', version: VERSION, uptime: process.uptime() }, error: null });
  });

  // ── Rooms list ──
  router.get('/rooms', auth, async (req, res) => {
    try {
      const ids = await store.getAllRoomIds();
      const rooms = [];
      for (const id of ids) {
        const room = await store.getRoom(id);
        if (room) {
          const players = await store.getPlayers(id);
          const connected = players.filter(p => p.socketId && activeSockets.has(p.socketId)).length;
          rooms.push({
            roomId: room.roomId,
            maxPlayers: room.maxPlayers,
            playerCount: players.length,
            connectedPlayerCount: connected,
            playerIndex: room.nextPlayerIndex,
            hasScreen: !!getScreenSocket(room.roomId),
            createdAt: room.createdAt || 0,
          });
        }
      }
      res.json({ ok: true, data: { rooms, count: rooms.length }, error: null });
    } catch (e) {
      res.json({ ok: false, data: null, error: { code: 'INTERNAL', message: e.message } });
    }
  });

  // ── Room detail ──
  router.get('/rooms/:roomId', auth, async (req, res) => {
    try {
      const room = await store.getRoom(req.params.roomId);
      if (!room) return res.json({ ok: false, data: null, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
      const players = await store.getPlayers(room.roomId);
      const connectedCount = players.filter(p => p.socketId && activeSockets.has(p.socketId)).length;
      res.json({ ok: true, data: {
        roomId: room.roomId,
        maxPlayers: room.maxPlayers,
        playerCount: players.length,
        connectedPlayerCount: connectedCount,
        players: players.map(p => ({ playerIndex: p.playerIndex, playerName: p.playerName, socketId: p.socketId, connected: !!activeSockets.get(p.socketId) })),
        nextPlayerIndex: room.nextPlayerIndex,
        hasScreen: !!getScreenSocket(room.roomId),
        createdAt: room.createdAt || 0,
      }, error: null });
    } catch (e) {
      res.json({ ok: false, data: null, error: { code: 'INTERNAL', message: e.message } });
    }
  });

  // ── Players ──
  router.get('/rooms/:roomId/players', auth, async (req, res) => {
    try {
      if (!(await store.roomExists(req.params.roomId))) return res.json({ ok: false, data: null, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
      const players = await store.getPlayers(req.params.roomId);
      res.json({ ok: true, data: { players: players.map(p => ({
        playerIndex: p.playerIndex, playerName: p.playerName, socketId: p.socketId, connected: !!activeSockets.get(p.socketId),
      })) }, error: null });
    } catch (e) {
      res.json({ ok: false, data: null, error: { code: 'INTERNAL', message: e.message } });
    }
  });

  // ── Controllers (same as players, per interface) ──
  router.get('/rooms/:roomId/controllers', auth, async (req, res) => {
    try {
      if (!(await store.roomExists(req.params.roomId))) return res.json({ ok: false, data: null, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
      const players = await store.getPlayers(req.params.roomId);
      res.json({ ok: true, data: { controllers: players.map(p => ({ playerIndex: p.playerIndex, playerName: p.playerName, connected: !!activeSockets.get(p.socketId) })) }, error: null });
    } catch (e) {
      res.json({ ok: false, data: null, error: { code: 'INTERNAL', message: e.message } });
    }
  });

  // ── Metrics summary ──
  router.get('/metrics-summary', auth, (req, res) => {
    res.json({ ok: true, data: metrics.jsonSummary(), error: null });
  });

  // ── Close room ──
  router.post('/rooms/:roomId/close', auth, async (req, res) => {
    try {
      const roomId = req.params.roomId;
      if (!(await store.roomExists(roomId))) return res.json({ ok: false, data: null, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });

      broadcastToControllers(roomId, { event: 'room_closed', roomId, reason: 'admin_closed' });
      const screenWs = getScreenSocket(roomId);
      if (screenWs) { try { screenWs.close(); } catch(e) {} }
      await store.deleteRoom(roomId);
      metrics.increment('roomsDestroyed', 1);

      res.json({ ok: true, data: { roomId, closed: true }, error: null });
    } catch (e) {
      res.json({ ok: false, data: null, error: { code: 'INTERNAL', message: e.message } });
    }
  });

  // ── Helper: find screen WS by roomId ──
  function getScreenSocket(roomId) {
    for (const [wsId, ws] of activeSockets) {
      if (ws.data.role === 'screen' && ws.data.roomId === roomId && ws.readyState === WebSocket.OPEN) {
        return ws;
      }
    }
    return null;
  }

  return { router, authMiddleware: auth };
}

module.exports = { createAdminRouter };
