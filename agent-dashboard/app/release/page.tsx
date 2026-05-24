'use client';

import { getReleaseState } from '@/lib/api/builds';

export default function ReleasePage() {
  const r = getReleaseState();
  const totalGates = r.gates.length;
  const passedGates = r.gates.filter(g => g.status === 'passed').length;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Canary / Release</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>
        Phase: <span style={{ color: '#51cf66', fontWeight: 600 }}>{r.phase}</span> · v{r.version} · {r.commit.substring(0, 7)}
      </p>

      {/* Phase progress */}
      <div className="glass" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Rollout Progress</div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[1, 5, 10, 25, 50, 100].map(pct => (
            <div key={pct} style={{
              flex: 1, height: 32,
              background: pct <= r.rolloutPercent ? '#51cf66' : 'rgba(255,255,255,0.08)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: pct <= r.rolloutPercent ? '#0a0a0f' : '#868e96',
              transition: 'all 0.3s',
            }}>{pct}%</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#868e96' }}>Phase 1 QA</span>
          <span style={{ color: '#51cf66' }}>Prod Candidate ✅</span>
        </div>
      </div>

      {/* Gate checklist */}
      <div className="glass" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Gate Status <span style={{ color: '#51cf66' }}>({passedGates}/{totalGates} PASS)</span>
        </div>
        {r.gates.map(g => (
          <div key={g.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span>{g.status === 'passed' ? '✅' : g.status === 'failed' ? '❌' : '⏳'}</span>
            <span style={{ flex: 1, fontSize: 13 }}>{g.name}</span>
            <span style={{
              background: g.status === 'passed' ? 'rgba(81,207,102,0.15)' :
                          g.status === 'failed' ? 'rgba(255,107,107,0.15)' :
                          'rgba(255,255,255,0.05)',
              color: g.status === 'passed' ? '#51cf66' :
                     g.status === 'failed' ? '#ff6b6b' : '#868e96',
              padding: '2px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
            }}>{g.status.toUpperCase()}</span>
          </div>
        ))}
      </div>

      {/* Rollback readiness */}
      <div className="glass" style={{
        border: '1px solid ' + (r.rollbackReady ? 'rgba(81,207,102,0.3)' : 'rgba(255,107,107,0.3)'),
        background: r.rollbackReady ? 'rgba(81,207,102,0.05)' : 'rgba(255,107,107,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>{r.rollbackReady ? '🟢' : '🔴'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: r.rollbackReady ? '#51cf66' : '#ff6b6b' }}>
              Rollback {r.rollbackReady ? 'Ready' : 'Blocked'}
            </div>
            <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>
              {r.rollbackReady
                ? 'Safe to rollback to v0.4.1 at any time.'
                : `${r.blockers.length} blocker(s) preventing rollback.`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
