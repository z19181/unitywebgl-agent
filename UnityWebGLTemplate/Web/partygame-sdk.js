/**
 * PartyGameSDK Web Client Library — v0.2.5
 *
 * 用法 (controller 端):
 *   const pg = new PartyGameSDK({ maxPlayers: 4 });
 *   pg.on('room_joined', (msg) => { ... });
 *   pg.join('A1B2C3');
 *   pg.sendInput('input.tap');
 *   pg.sendInput('input.charge_end', { power: 0.8 });
 *
 * 注意事项:
 *   ⚠️ 不发送 playerIndex（由 server 注入）
 *   ⚠️ room_joined 返回 reconnectToken（自动存储到 localStorage）
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) define([], factory);
  else if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PartyGameSDK = factory();
}(this, function () {
  'use strict';

  var MSG = {
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    GAME_MESSAGE: 'game_message',
    RECONNECT: 'reconnect',
    CLOSE_ROOM: 'close_room',
  };

  function PartyGameSDK(opts) {
    opts = opts || {};
    this._url = opts.url || (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host;
    this._listeners = {};
    this._ws = null;
    this._roomId = null;
    this._playerIndex = null;
    this._playerName = null;
    this._reconnectToken = null;
    this._isRoomOpen = false;
    this._autoReconnect = opts.autoReconnect !== false;
    this._reconnectInterval = opts.reconnectInterval || 3000;
  }

  PartyGameSDK.prototype = {
    /* ─── 事件系统 ─── */

    on: function (event, fn) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
      return this;
    },

    off: function (event, fn) {
      var list = this._listeners[event];
      if (list) this._listeners[event] = list.filter(function (f) { return f !== fn; });
      return this;
    },

    _emit: function (event, data) {
      var list = this._listeners[event];
      if (list) list.forEach(function (fn) { fn(data); });
    },

    /* ─── 连接 ─── */

    connect: function () {
      var self = this;
      this._ws = new WebSocket(this._url);

      this._ws.onopen = function () {
        console.log('[PartyGameSDK] Connected');
        self._emit('connected', {});

        // 尝试重连
        var roomId = self._roomId || self._getUrlParam('room');
        if (roomId) {
          var savedToken = localStorage.getItem('pg_reconnect_' + roomId);
          if (savedToken) {
            self._reconnectToken = savedToken;
            self._ws.send(JSON.stringify({
              event: MSG.RECONNECT,
              reconnectToken: savedToken,
              roomId: roomId
            }));
            return;
          }
          self.join(roomId);
        }
      };

      this._ws.onmessage = function (event) {
        var msg;
        try { msg = JSON.parse(event.data); }
        catch (e) { console.error('[PartyGameSDK] JSON error', e); return; }
        self._handleMessage(msg);
      };

      this._ws.onclose = function () {
        console.log('[PartyGameSDK] Disconnected');
        self._emit('disconnected', {});
        if (self._autoReconnect) {
          setTimeout(function () { self.connect(); }, self._reconnectInterval);
        }
      };

      this._ws.onerror = function (e) { console.error('[PartyGameSDK] Error', e); };

      return this;
    },

    /* ─── 房间操作 ─── */

    create: function (maxPlayers) {
      this._send({ event: MSG.CREATE_ROOM, maxPlayers: maxPlayers || 4 });
      return this;
    },

    join: function (roomId) {
      this._send({ event: MSG.JOIN_ROOM, roomId: roomId });
      return this;
    },

    closeRoom: function () {
      this._send({ event: MSG.CLOSE_ROOM });
      return this;
    },

    /* ─── 游戏输入 ─── */

    sendInput: function (type, data) {
      // ⚠️ 不发送 playerIndex（五条铁律）
      this._send({
        event: MSG.GAME_MESSAGE,
        type: type,
        data: data ? JSON.stringify(data) : undefined
      });
      return this;
    },

    /* ─── 内部方法 ─── */

    _send: function (obj) {
      if (this._ws && this._ws.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify(obj));
      }
    },

    _handleMessage: function (msg) {
      var self = this;

      switch (msg.event) {

        case 'room_joined':
          this._roomId = msg.roomId;
          this._playerIndex = msg.playerIndex;
          this._playerName = msg.playerName;
          this._reconnectToken = msg.reconnectToken;
          this._isRoomOpen = true;
          if (this._reconnectToken) {
            localStorage.setItem('pg_reconnect_' + msg.roomId, this._reconnectToken);
          }
          this._emit('room_joined', msg);
          break;

        case 'reconnected':
          this._playerIndex = msg.playerIndex;
          this._playerName = msg.playerName;
          this._reconnectToken = msg.reconnectToken;
          this._isRoomOpen = true;
          if (this._reconnectToken) {
            localStorage.setItem('pg_reconnect_' + msg.roomId, this._reconnectToken);
          }
          this._emit('reconnected', msg);
          break;

        case 'reconnect_failed':
          localStorage.removeItem('pg_reconnect_' + this._roomId);
          this._reconnectToken = null;
          this._emit('reconnect_failed', msg);
          break;

        case 'broadcast':
          this._emit('broadcast', msg);
          this._emit(msg.type, msg);  // 如 'state.score_update'
          break;

        case 'players.changed':
          this._players = msg.players;
          this._emit('players_changed', msg);
          break;

        case 'player_joined':
        case 'player_left':
          this._players = msg.players;
          this._emit(msg.event, msg);
          break;

        case 'room_closed':
          this._isRoomOpen = false;
          localStorage.removeItem('pg_reconnect_' + msg.roomId);
          this._emit('room_closed', msg);
          break;

        case 'room_not_found':
          this._emit('room_not_found', msg);
          break;

        case 'room_full':
          this._emit('room_full', msg);
          break;

        default:
          this._emit(msg.event || msg.type, msg);
      }
    },

    _getUrlParam: function (name) {
      return new URLSearchParams(location.search).get(name);
    },

    /* ─── 工具 ─── */

    getPlayerIndex: function () { return this._playerIndex; },
    getRoomId: function () { return this._roomId; },
    getPlayers: function () { return this._players || []; },
    isConnected: function () { return this._ws && this._ws.readyState === WebSocket.OPEN; },
    isRoomOpen: function () { return this._isRoomOpen; },

    disconnect: function () {
      this._autoReconnect = false;
      if (this._ws) this._ws.close();
    },

    destroy: function () {
      this.disconnect();
      this._listeners = {};
    },
  };

  return PartyGameSDK;
}));
