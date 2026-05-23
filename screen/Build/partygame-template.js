/**
 * PartyGameSDK v0.2.5 — WebGL Template Initialization
 *
 * 在 Unity WebGL Template index.html 中加载，负责:
 *   1. 创建 WebSocket → server
 *   2. 注册 window.PartyGameSendToServer (供 jslib 调用)
 *   3. room 生命周期 (创建/QR/关闭)
 *   4. 转发 server 消息 → unityInstance.SendMessage
 *   5. 显示 QR Code / 玩家列表 / 房间状态
 *
 * 约定:
 *   - Unity GameObject 名称: "PartyGameBridge"
 *   - Unity 接收方法:      OnPlatformMessage(string json)
 */

(function () {
  'use strict';

  /* ───────── 状态 ───────── */
  let ws = null;
  let roomId = null;
  let maxPlayers = 4;
  let players = [];
  let reconnectSecret = null;

  /* ───────── 初始化 ───────── */
  window.PartyGameInit = function (opts) {
    maxPlayers = opts.maxPlayers || 4;
    connect();
  };

  /* ───────── WebSocket ───────── */
  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = protocol + '//' + location.host;
    console.log('[PartyGame] Connecting to', url);
    updateStatus('🟡 Connecting...');

    ws = new WebSocket(url);
    ws.onopen  = onOpen;
    ws.onmessage = onMessage.bind(this);
    ws.onclose = onClose;
    ws.onerror = function (e) { console.error('[PartyGame] WebSocket error', e); };
  }

  function onOpen() {
    console.log('[PartyGame] Connected');
    updateStatus('🟢 Creating room...');

    ws.send(JSON.stringify({
      event: 'create_room',
      maxPlayers: maxPlayers
    }));
  }

  function onMessage(event) {
    var msg;
    try { msg = JSON.parse(event.data); }
    catch (e) { console.error('[PartyGame] JSON parse error', e); return; }

    switch (msg.event) {

      // ── 房间创建 ──
      case 'room_created':
        roomId = msg.roomId;
        reconnectSecret = msg.reconnectSecret;
        updateRoomInfo(msg);
        console.log('[PartyGame] Room created:', roomId);
        break;

      // ── 玩家加入 ──
      case 'player_joined':
        updatePlayers(msg);
        forwardToUnity('player_joined', msg);
        break;

      // ── 玩家离开 ──
      case 'player_left':
        updatePlayers(msg);
        forwardToUnity('player_left', msg);
        break;

      // ── 玩家重连 ──
      case 'player_reconnected':
        updatePlayers(msg);
        forwardToUnity('player_reconnected', msg);
        break;

      // ── 玩家列表变化 ──
      case 'players.changed':
        players = msg.players || [];
        renderPlayersList();
        break;

      // ── 游戏消息 → Unity ──
      case 'game_message':
        forwardToUnity('game_message', msg);
        break;

      // ── 房间关闭 ──
      case 'room_closed':
        updateStatus(msg.reason === 'host_closed' ? '🔴 Room closed' : '🔴 Host disconnected');
        break;

      default:
        console.log('[PartyGame] Unhandled:', msg.event);
    }
  }

  function onClose() {
    console.log('[PartyGame] Disconnected, reconnecting in 3s...');
    updateStatus('🔴 Disconnected');
    setTimeout(connect, 3000);
  }

  /* ───────── Unity 转发 ───────── */
  function forwardToUnity(msgType, msg) {
    if (window.unityInstance) {
      var json = JSON.stringify(msg);
      window.unityInstance.SendMessage('PartyGameBridge', 'OnPlatformMessage', json);
      console.log('[PartyGame] → Unity [' + msgType + ']');
    } else {
      console.warn('[PartyGame] unityInstance not ready, queuing...');
      setTimeout(function () { forwardToUnity(msgType, msg); }, 200);
    }
  }

  /* ───────── Unity → Server ───────── */
  // 由 PartyGameBridge.jslib 调用
  window.PartyGameSendToServer = function (jsonMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(jsonMessage);
      console.log('[PartyGame] Unity → server:', jsonMessage);
    } else {
      console.error('[PartyGame] Cannot send, WebSocket not open');
    }
  };

  /* ───────── 关闭房间 ───────── */
  window.PartyGameCloseRoom = function () {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event: 'close_room' }));
      console.log('[PartyGame] Closing room...');
    }
  };

  /* ───────── UI 更新 ───────── */
  function updateStatus(text) {
    var el = document.getElementById('pg-status');
    if (el) el.textContent = text;
  }

  function updateRoomInfo(msg) {
    var roomIdEl = document.getElementById('pg-roomId');
    var qrEl     = document.getElementById('pg-qrcode');
    var joinEl   = document.getElementById('pg-joinUrl');
    var statusEl = document.getElementById('pg-status');

    if (roomIdEl)  roomIdEl.textContent  = 'Room: ' + (msg.roomId || roomId);
    if (statusEl)  statusEl.textContent  = '🟢 Room Open';
    if (joinEl)    joinEl.textContent    = msg.qrUrl || '';

    // QR Code (canvas)
    if (qrEl && msg.qrUrl) {
      renderQR(qrEl, msg.qrUrl);
    }

    updatePlayers(msg);
  }

  function updatePlayers(msg) {
    if (msg.players) players = msg.players;
    renderPlayersList();
  }

  function renderPlayersList() {
    var el = document.getElementById('pg-players');
    if (!el) return;
    if (!players || players.length === 0) {
      el.innerHTML = '<span style="opacity:0.5">Waiting for players...</span>';
      return;
    }
    el.innerHTML = players.map(function (p) {
      return '<span class="pg-player-badge">P' + p.playerIndex + ' ' + (p.playerName || '') + '</span>';
    }).join(' ');
  }

  /* ───────── QR Code (轻量实现, canvas 渲染) ───────── */
  function renderQR(el, url) {
    // 使用 Google Charts API 生成 QR (简单方案)
    var size = Math.min(el.clientWidth || 200, 200);
    el.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=' +
      size + 'x' + size + '&data=' + encodeURIComponent(url) +
      '" alt="QR Code" style="width:100%;height:auto;border-radius:8px;" />';
  }
})();
