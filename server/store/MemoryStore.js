// server/store/MemoryStore.js — v0.3.1 In-Memory Store (default)
//
// Mirrors v0.3.0 in-process Map-based state exactly.
// All methods return Promises for Store interface compatibility.

const Store = require('./Store');
const crypto = require('crypto');

class MemoryStore extends Store {
  constructor() {
    super();
    this.rooms = new Map();           // roomId → roomData
    this.playerSockets = new Map();   // socketId → { roomId, playerIndex }
    this.reconnectTokens = new Map(); // token → { roomId, playerIndex, data, timerId }
  }

  async createRoom(roomData) {
    const roomId = roomData.roomId;
    this.rooms.set(roomId, {
      ...roomData,
      players: [],
      nextPlayerIndex: 0,
      createdAt: Date.now(),
    });
    return this.rooms.get(roomId);
  }

  async getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  async updateRoom(roomId, patch) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    Object.assign(room, patch);
    return room;
  }

  async deleteRoom(roomId) {
    // Cleanup reconnect tokens for this room
    for (const [token, info] of this.reconnectTokens) {
      if (info.roomId === roomId) {
        clearTimeout(info.timerId);
        this.reconnectTokens.delete(token);
      }
    }
    this.rooms.delete(roomId);
    return true;
  }

  async roomExists(roomId) {
    return this.rooms.has(roomId);
  }

  async getAllRoomIds() {
    return [...this.rooms.keys()];
  }

  // ── Players ──

  async addPlayer(roomId, playerIndex, data) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = { playerIndex, ...data };
    room.players = [...room.players.filter(p => p.playerIndex !== playerIndex), player];
    return player;
  }

  async removePlayer(roomId, playerIndex) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const removed = room.players.find(p => p.playerIndex === playerIndex);
    room.players = room.players.filter(p => p.playerIndex !== playerIndex);
    return removed || null;
  }

  async getPlayers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? [...room.players] : [];
  }

  async getPlayerCount(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.players.length : 0;
  }

  // ── Player ↔ Socket mapping ──

  async setPlayerSocket(roomId, playerIndex, socketId) {
    this.playerSockets.set(socketId, { roomId, playerIndex });
  }

  async getPlayerBySocket(socketId) {
    return this.playerSockets.get(socketId) || null;
  }

  async deletePlayerSocket(socketId) {
    this.playerSockets.delete(socketId);
  }

  // ── PlayerIndex allocation ──

  async allocatePlayerIndex(roomId, maxPlayers) {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.players.length >= maxPlayers) return null;
    const pi = room.nextPlayerIndex++;
    return pi;
  }

  // ── ReconnectToken ──

  async setReconnectToken(roomId, playerIndex, data, ttlSeconds) {
    const token = crypto.randomBytes(16).toString('hex');
    const timerId = setTimeout(() => {
      // After TTL, auto-remove token (player stays until explicit removePlayer)
      this.reconnectTokens.delete(token);
    }, ttlSeconds * 1000);
    this.reconnectTokens.set(token, { roomId, playerIndex, data, timerId });
    return token;
  }

  async getReconnectToken(roomId, reconnectToken) {
    const info = this.reconnectTokens.get(reconnectToken);
    if (!info || info.roomId !== roomId) return null;
    return info;
  }

  async deleteReconnectToken(roomId, reconnectToken) {
    const info = this.reconnectTokens.get(reconnectToken);
    if (info && info.roomId === roomId) {
      if (info.timerId) clearTimeout(info.timerId);
    }
    this.reconnectTokens.delete(reconnectToken);
  }

  // ── Socket sessions ──

  async setSocketSession(socketId, session) {
    // No-op: sessions stored on ws.data in-memory, no cross-instance support needed here
  }

  async getSocketSession(socketId) {
    return null; // MemoryStore doesn't store sessions cross-process
  }

  async deleteSocketSession(socketId) {
    // No-op
  }

  // ── Metrics ──

  async getRoomCount() {
    return this.rooms.size;
  }

  async close() {}
}

module.exports = MemoryStore;
