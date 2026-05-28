// server/store/RedisStore.js — v0.3.1 Redis-backed Store
//
// Enable with: STORE_TYPE=redis REDIS_URL=redis://localhost:6379
//
// Key naming:
//   pg:room:{roomId}              → Hash: { roomId, screenSocketId?, maxPlayers, playersJson, nextPlayerIndex }
//   pg:room:{roomId}:players      → Hash: playerIndex → JSON { playerName, socketId }
//   pg:room:{roomId}:reconnect    → Hash: token → JSON { playerIndex, playerName, socketId }
//   pg:socket:{socketId}          → Hash: session data
//   pg:reconnect:{token}          → String: JSON { roomId, playerIndex, playerName } (TTL 10s)

const Store = require('./Store');
const crypto = require('crypto');

class RedisStore extends Store {
  constructor(redis, opts = {}) {
    super();
    this.redis = redis;  // ioredis instance
    this.reconnectTTL = opts.reconnectTTL || 10;
  }

  // ── Room ──

  async createRoom(roomData) {
    const key = `pg:room:${roomData.roomId}`;
    await this.redis.hset(key, {
      roomId: roomData.roomId,
      screenSocketId: roomData.screenSocketId || '',
      maxPlayers: roomData.maxPlayers || 4,
      reconnectSecret: roomData.reconnectSecret || '',
      nextPlayerIndex: '0',
      createdAt: String(Date.now()),
    });
    return this.getRoom(roomData.roomId);
  }

  async getRoom(roomId) {
    const key = `pg:room:${roomId}`;
    const data = await this.redis.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    return {
      roomId: data.roomId,
      screenSocketId: data.screenSocketId || null,
      maxPlayers: parseInt(data.maxPlayers) || 4,
      nextPlayerIndex: parseInt(data.nextPlayerIndex) || 0,
      reconnectSecret: data.reconnectSecret || '',
      createdAt: parseInt(data.createdAt) || 0,
    };
  }

  async updateRoom(roomId, patch) {
    const key = `pg:room:${roomId}`;
    const hpatch = {};
    if (patch.screenSocketId !== undefined) hpatch.screenSocketId = patch.screenSocketId;
    if (patch.maxPlayers !== undefined) hpatch.maxPlayers = String(patch.maxPlayers);
    if (patch.nextPlayerIndex !== undefined) hpatch.nextPlayerIndex = String(patch.nextPlayerIndex);
    await this.redis.hset(key, hpatch);
    return this.getRoom(roomId);
  }

  async deleteRoom(roomId) {
    const keys = [
      `pg:room:${roomId}`,
      `pg:room:${roomId}:players`,
      `pg:room:${roomId}:reconnect`,
    ];
    // Also cleanup individual reconnect token keys
    try {
      const tokens = await this.redis.hkeys(`pg:room:${roomId}:reconnect`);
      for (const t of tokens) keys.push(`pg:reconnect:${t}`);
    } catch (e) {}
    await this.redis.del(...keys);
    return true;
  }

  async roomExists(roomId) {
    return (await this.redis.exists(`pg:room:${roomId}`)) === 1;
  }

  async getAllRoomIds() {
    return await this.redis.keys('pg:room:*').then(keys =>
      keys.filter(k => !k.includes(':players') && !k.includes(':reconnect'))
           .map(k => k.replace('pg:room:', ''))
    );
  }

  // ── Players ──

  async addPlayer(roomId, playerIndex, data) {
    const key = `pg:room:${roomId}:players`;
    await this.redis.hset(key, String(playerIndex), JSON.stringify(data));
    return { playerIndex, ...data };
  }

  async removePlayer(roomId, playerIndex) {
    const key = `pg:room:${roomId}:players`;
    const json = await this.redis.hget(key, String(playerIndex));
    await this.redis.hdel(key, String(playerIndex));
    return json ? { playerIndex, ...JSON.parse(json) } : null;
  }

  async getPlayers(roomId) {
    const key = `pg:room:${roomId}:players`;
    const all = await this.redis.hgetall(key);
    return Object.entries(all).map(([pi, json]) => ({ playerIndex: parseInt(pi), ...JSON.parse(json) }));
  }

  async getPlayerCount(roomId) {
    return await this.redis.hlen(`pg:room:${roomId}:players`);
  }

  // ── Player ↔ Socket mapping ──

  async setPlayerSocket(roomId, playerIndex, socketId) {
    await this.redis.hset(`pg:socket:${socketId}`, 'roomId', roomId, 'playerIndex', String(playerIndex));
  }

  async getPlayerBySocket(socketId) {
    const data = await this.redis.hgetall(`pg:socket:${socketId}`);
    if (!data || Object.keys(data).length === 0) return null;
    return { roomId: data.roomId, playerIndex: parseInt(data.playerIndex) };
  }

  async deletePlayerSocket(socketId) {
    await this.redis.del(`pg:socket:${socketId}`);
  }

  // ── PlayerIndex allocation (atomic) ──

  async allocatePlayerIndex(roomId, maxPlayers) {
    const playerCount = await this.getPlayerCount(roomId);
    if (playerCount >= maxPlayers) return null;
    const key = `pg:room:${roomId}`;
    const pi = await this.redis.hincrby(key, 'nextPlayerIndex', 1) - 1;
    return pi;
  }

  // ── ReconnectToken ──

  async setReconnectToken(roomId, playerIndex, data, ttlSeconds = 10) {
    const token = crypto.randomBytes(16).toString('hex');
    // Store in room's reconnect hash
    await this.redis.hset(`pg:room:${roomId}:reconnect`, token, JSON.stringify({
      playerIndex, playerName: data.playerName, socketId: data.socketId,
    }));
    // TTL key
    await this.redis.set(`pg:reconnect:${token}`, JSON.stringify({ roomId, playerIndex, playerName: data.playerName }), 'EX', ttlSeconds);
    return token;
  }

  async getReconnectToken(roomId, reconnectToken) {
    const json = await this.redis.get(`pg:reconnect:${reconnectToken}`);
    if (!json) return null;
    const info = JSON.parse(json);
    if (info.roomId !== roomId) return null;
    return info;
  }

  async deleteReconnectToken(roomId, reconnectToken) {
    await this.redis.hdel(`pg:room:${roomId}:reconnect`, reconnectToken);
    await this.redis.del(`pg:reconnect:${reconnectToken}`);
  }

  // ── Socket sessions ──

  async setSocketSession(socketId, session) {
    const key = `pg:socket:${socketId}`;
    await this.redis.hset(key, 'session', JSON.stringify(session));
    await this.redis.expire(key, 3600); // 1h TTL
  }

  async getSocketSession(socketId) {
    const data = await this.redis.hget(`pg:socket:${socketId}`, 'session');
    return data ? JSON.parse(data) : null;
  }

  async deleteSocketSession(socketId) {
    await this.redis.del(`pg:socket:${socketId}`);
  }

  // ── Metrics ──

  async getRoomCount() {
    const keys = await this.redis.keys('pg:room:*');
    return keys.filter(k => !k.includes(':players') && !k.includes(':reconnect')).length;
  }

  async close() {
    // Do not disconnect — caller owns the Redis connection
  }
}

module.exports = RedisStore;
