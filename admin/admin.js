// admin/admin.js — v0.3.4 Admin UI
let currentDetailRoom = null;

const TOKEN = localStorage.getItem('admin_token') || '';
function headers() { const h = {}; if (TOKEN) h['Authorization'] = 'Bearer ' + TOKEN; return h; }

async function api(path, opts = {}) {
  try {
    const res = await fetch(path, { headers: headers(), ...opts });
    return await res.json();
  } catch (e) { return { ok: false, error: { message: e.message } }; }
}

// Token prompt
function promptToken() {
  const t = prompt('Admin token (or leave blank if dev mode):');
  if (t) { localStorage.setItem('admin_token', t); location.reload(); }
}
if (!TOKEN) setTimeout(promptToken, 500);

// Health
async function checkHealth() {
  const r = await api('/admin/health');
  const badge = document.getElementById('healthBadge');
  if (r.ok) {
    const h = r.data; badge.textContent = '● Healthy'; badge.className = 'ok';
    document.getElementById('cardUptime').querySelector('.val').textContent = fmtSec(h.uptime);
  } else { badge.textContent = '● Down'; badge.className = 'err'; }
}

// Metrics summary
async function loadMetrics() {
  const r = await api('/admin/metrics-summary');
  if (!r.ok) return;
  const d = r.data;
  document.getElementById('cardRooms').querySelector('.val').textContent = d.activeRooms;
  document.getElementById('cardPlayers').querySelector('.val').textContent = d.activeControllers || 0;
  document.getElementById('cardControllers').querySelector('.val').textContent = d.activeControllers || 0;
  document.getElementById('cardWS').querySelector('.val').textContent = d.activeConnections;
  const errTotal = Object.values(d.errors || {}).reduce((a,b) => a+b, 0);
  document.getElementById('cardErrors').querySelector('.val').textContent = errTotal;
}

// Rooms
async function loadRooms() {
  const r = await api('/admin/rooms');
  const tbody = document.getElementById('roomsBody');
  if (!r.ok) { tbody.innerHTML = '<tr><td colspan="6">Failed: ' + (r.error?.message||'') + '</td></tr>'; return; }
  const rooms = r.data.rooms;
  if (rooms.length === 0) { tbody.innerHTML = '<tr><td colspan="6">No active rooms</td></tr>'; return; }
  tbody.innerHTML = rooms.map(rm => `
    <tr>
      <td><code>${rm.roomId}</code></td>
      <td>${rm.playerCount}/${rm.maxPlayers}</td>
      <td>${rm.maxPlayers}</td>
      <td>${rm.hasScreen ? '🟢' : '⚫'}</td>
      <td>${fmtTime(rm.createdAt)}</td>
      <td>
        <button class="btn sm" onclick="viewRoom('${rm.roomId}')">Detail</button>
        <button class="btn sm danger" onclick="closeRoom('${rm.roomId}')">Close</button>
      </td>
    </tr>
  `).join('');
}

// Room detail
async function viewRoom(roomId) {
  currentDetailRoom = roomId;
  const r = await api('/admin/rooms/' + roomId);
  if (!r.ok) return alert('Room not found');
  const d = r.data;
  document.getElementById('detailRoomId').textContent = roomId;
  document.getElementById('detailInfo').innerHTML = `
    Max Players: ${d.maxPlayers} &nbsp;|&nbsp;
    Players: ${d.playerCount} &nbsp;|&nbsp;
    Screen: ${d.hasScreen ? '🟢 Connected' : '⚫ Disconnected'} &nbsp;|&nbsp;
    Created: ${fmtTime(d.createdAt)}
  `;
  document.getElementById('detailPlayers').innerHTML = d.players.map(p => `
    <tr><td>P${p.playerIndex}</td><td>${p.playerName}</td><td>${p.connected ? '🟢' : '⚫'}</td></tr>
  `).join('');
  document.getElementById('roomDetail').style.display = 'block';
}

// Close room
async function closeRoom(roomId) {
  if (!confirm('Close room ' + roomId + '? All controllers will be disconnected.')) return;
  const r = await api('/admin/rooms/' + roomId + '/close', { method: 'POST' });
  if (r.ok) { loadRooms(); document.getElementById('roomDetail').style.display = 'none'; }
  else alert('Failed: ' + (r.error?.message || ''));
}

// Refresh
setInterval(() => { checkHealth(); loadMetrics(); loadRooms(); }, 5000);
checkHealth(); loadMetrics(); loadRooms();

function fmtTime(ts) { if (!ts || ts < 1000000) return '-'; return new Date(ts).toLocaleTimeString(); }
function fmtSec(s) { if (s < 60) return Math.floor(s)+'s'; return Math.floor(s/60)+'m'; }
