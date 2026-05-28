/**
 * PartyGameSDK Controller Base — v0.2.5
 *
 * 标准 controller 页面使用:
 *   1. 引入 partygame-sdk.js
 *   2. 引入 controller-base.js
 *   3. 调用 ControllerInit({ gameName: 'MyGame' });
 *   4. 实现 onGameMessage(type, data) 处理自定义消息
 *
 * 约定:
 *   - controller 只发送 input.xxx（五条铁律）
 *   - controller 只更新 UI（不计算游戏状态）
 *   - playerIndex 由 server 注入，不能伪造
 */

(function () {
  'use strict';

  var pg;
  var gameName = 'PartyGame';

  /* ───────── 初始化 ───────── */
  window.ControllerInit = function (opts) {
    opts = opts || {};
    gameName = opts.gameName || 'PartyGame';

    pg = new PartyGameSDK({ autoReconnect: true });
    bindEvents();
    pg.connect();

    return pg;
  };

  /* ───────── 事件绑定 ───────── */
  function bindEvents() {
    pg.on('room_joined', function (msg) {
      log('🎮 Joined as P' + msg.playerIndex + ' in room ' + msg.roomId);
      updateStatus('🟢 Ready — P' + msg.playerIndex);
      renderPlayerIndex(msg.playerIndex, msg.playerName);
      renderPlayers(msg.players || [msg]);
    });

    pg.on('reconnected', function (msg) {
      log('🔄 Reconnected as P' + msg.playerIndex);
      updateStatus('🟢 Reconnected — P' + msg.playerIndex);
      renderPlayerIndex(msg.playerIndex, msg.playerName);
      renderPlayers(msg.players || [msg]);
    });

    pg.on('reconnect_failed', function () {
      log('❌ Reconnect failed, retry as new player...');
      updateStatus('🔴 Reconnect failed');
    });

    pg.on('players_changed', function (msg) {
      renderPlayers(msg.players);
    });

    pg.on('player_joined', function (msg) {
      log('👤 P' + msg.playerIndex + ' joined');
      renderPlayers(msg.players || []);
    });

    pg.on('player_left', function (msg) {
      log('👋 P' + msg.playerIndex + ' left');
      renderPlayers(msg.players || []);
    });

    pg.on('room_closed', function (msg) {
      var reason = msg.reason === 'host_closed' ? '主持人关闭了房间' : '主机已断开';
      updateStatus('🔴 ' + reason);
      disableInput();
    });

    pg.on('room_not_found', function () {
      updateStatus('❌ Room not found');
    });

    pg.on('room_full', function () {
      updateStatus('❌ Room full');
    });

    // Broadcast messages
    pg.on('state.score_update', function (msg) {
      var scores = parseScores(msg.data);
      var myScore = scores[pg.getPlayerIndex()] || scores[String(pg.getPlayerIndex())] || 0;
      updateScore(myScore);
    });

    pg.on('state.game_over', function (msg) {
      updateStatus('🏁 Game Over');
      disableInput();
      if (window.onGameOver) window.onGameOver(msg);
    });

    // Custom game message handler
    pg.on('broadcast', function (msg) {
      if (window.onBroadcast) window.onBroadcast(msg);
    });
  }

  /* ───────── 输入发送 ───────── */

  // ⚠️ 不发送 playerIndex (server 注入)
  window.sendTap      = function ()          { pg.sendInput(PartyGameInput.TAP); };
  window.sendMove     = function (x)         { pg.sendInput(PartyGameInput.MOVE, { x: x }); };
  window.sendChargeStart = function ()        { pg.sendInput(PartyGameInput.CHARGE_START); };
  window.sendChargeEnd   = function (power)  { pg.sendInput(PartyGameInput.CHARGE_END, { power: power }); };

  /* ───────── 工具函数 ───────── */

  function parseScores(data) {
    if (typeof data === 'string') { try { return JSON.parse(data); } catch(e) {} }
    else if (data && data.scores) {
      if (typeof data.scores === 'string') { try { return JSON.parse(data.scores); } catch(e) {} }
      else return data.scores;
    }
    return data || {};
  }

  function log(msg) { console.log('[Controller/' + gameName + '] ' + msg); }

  /* ───────── UI 渲染（可覆盖） ───────── */
  function updateStatus(text)   { var el = document.getElementById('status');   if (el) el.textContent = text; }
  function updateScore(s)       { var el = document.getElementById('score');    if (el) el.textContent = 'Score: ' + s; }
  function renderPlayerIndex(pi, pn) {
    var el = document.getElementById('playerInfo');
    if (el) el.textContent = 'P' + pi + ' ' + (pn || '');
  }
  function renderPlayers(plist) {
    var el = document.getElementById('playersList');
    if (!el) return;
    if (!plist || plist.length === 0) { el.textContent = 'Waiting...'; return; }
    var myPI = pg.getPlayerIndex();
    el.innerHTML = plist.map(function (p) {
      return '<span class="pg-badge">' + (p.playerIndex === myPI ? '★' : '·') + ' P' + p.playerIndex + '</span>';
    }).join(' ');
  }
  function disableInput() {
    var el = document.getElementById('inputArea');
    if (el) el.style.pointerEvents = 'none';
  }

})();

// ── 输入类型常量（可全局使用） ──
window.PartyGameInput = {
  TAP:          'input.tap',
  MOVE:         'input.move',
  CHARGE_START: 'input.charge_start',
  CHARGE_END:   'input.charge_end',
};
