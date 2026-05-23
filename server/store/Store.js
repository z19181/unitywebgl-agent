// server/store/Store.js — v0.3.1 Abstract Store Interface
//
// All room/player/token state must flow through this interface.
// Implementations: MemoryStore (default), RedisStore (REDIS_URL).
//
// Methods marked async — always return Promises.

class Store {
  // ── Room lifecycle ──
  async createRoom(roomData) { throw new Error('Not implemented'); }
  async getRoom(roomId)      { throw new Error('Not implemented'); }
  async updateRoom(roomId, patch) { throw new Error('Not implemented'); }
  async deleteRoom(roomId)   { throw new Error('Not implemented'); }
  async roomExists(roomId)   { throw new Error('Not implemented'); }
  async getAllRoomIds()      { throw new Error('Not implemented'); }

  // ── Controller / Player ──
  async addPlayer(roomId, playerIndex, data)  { throw new Error('Not implemented'); }
  async removePlayer(roomId, playerIndex)     { throw new Error('Not implemented'); }
  async getPlayers(roomId)                    { throw new Error('Not implemented'); }
  async getPlayerCount(roomId)                { throw new Error('Not implemented'); }

  // ── Player ↔ WS mapping (socketId = ws.id) ──
  async setPlayerSocket(roomId, playerIndex, socketId)  { throw new Error('Not implemented'); }
  async getPlayerBySocket(socketId)                      { throw new Error('Not implemented'); }

  // ── PlayerIndex allocation ──
  async allocatePlayerIndex(roomId, maxPlayers) { throw new Error('Not implemented'); }

  // ── ReconnectToken ──
  async setReconnectToken(roomId, playerIndex, data, ttlSeconds) { throw new Error('Not implemented'); }
  async getReconnectToken(roomId, reconnectToken)                { throw new Error('Not implemented'); }
  async deleteReconnectToken(roomId, reconnectToken)             { throw new Error('Not implemented'); }

  // ── Socket sessions ──
  async setSocketSession(socketId, session)   { throw new Error('Not implemented'); }
  async getSocketSession(socketId)            { throw new Error('Not implemented'); }
  async deleteSocketSession(socketId)           { throw new Error('Not implemented'); }

  // ── Metrics ──
  async getRoomCount()  { throw new Error('Not implemented'); }

  // ── Lifecycle ──
  async init() {}
  async close() {}
}

module.exports = Store;
