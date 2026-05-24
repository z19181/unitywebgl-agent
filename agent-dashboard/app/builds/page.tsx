'use client';

import { getBuilds, getReleaseState } from '@/lib/api/builds';

const statusStyles: Record<string, { bg: string; color: string; icon: string }> = {
  passed: { bg: 'rgba(81,207,102,0.15)', color: '#51cf66', icon: '✅' },
  building: { bg: 'rgba(255,212,59,0.15)', color: '#ffd43b', icon: '🔄' },
  failed: { bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b', icon: '❌' },
  queued: { bg: 'rgba(255,255,255,0.05)', color: '#868e96', icon: '⏳' },
};

export default function BuildsPage() {
  const builds = getBuilds();
  const release = getReleaseState();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Build Queue</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>{builds.length} games · {release.version} · {release.phase}</p>

      {/* Build cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {builds.map(b => {
          const s = statusStyles[b.status];
          return (
            <div key={b.name} className="glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</span>
                <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                  {s.icon} {b.gate}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div>
                  <span style={{ color: '#868e96' }}>Checks: </span>
                  <span className="mono" style={{ color: '#51cf66' }}>{b.checks}</span>
                </div>
                <div>
                  <span style={{ color: '#868e96' }}>Duration: </span>
                  <span className="mono">{b.duration}</span>
                </div>
                <div>
                  <span style={{ color: '#868e96' }}>Last: </span>
                  <span>{b.lastBuild}</span>
                </div>
                <div>
                  <span style={{ color: '#868e96' }}>Screenshots: </span>
                  <span>{b.screenshots}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Release gates */}
      <div className="glass" style={{ marginTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
          Release Gates — {release.phase} ({release.rolloutPercent}%)
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {release.gates.map((g, i) => (
            <div key={g.name} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              background: g.status === 'passed' ? 'rgba(81,207,102,0.1)' :
                          g.status === 'failed' ? 'rgba(255,107,107,0.1)' :
                          'rgba(255,255,255,0.03)',
              borderRadius: 8,
              border: '1px solid ' + (g.status === 'passed' ? 'rgba(81,207,102,0.3)' :
                        g.status === 'failed' ? 'rgba(255,107,107,0.3)' :
                        'rgba(255,255,255,0.1)'),
            }}>
              <span>{g.status === 'passed' ? '✅' : g.status === 'failed' ? '❌' : '⏳'}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{g.name}</div>
                <div style={{ fontSize: 10, color: g.status === 'passed' ? '#51cf66' : '#868e96' }}>{g.status.toUpperCase()}</div>
              </div>
            </div>
          ))}
        </div>
        {release.blockers.length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(255,107,107,0.1)', borderRadius: 8 }}>
            <span style={{ color: '#ff6b6b', fontWeight: 600 }}>⚠️ Blockers:</span>
            {release.blockers.map((b, i) => (
              <div key={i} style={{ color: '#ff6b6b', fontSize: 12, marginTop: 4 }}>• {b}</div>
            ))}
          </div>
        )}
        {release.blockers.length === 0 && (
          <div style={{ marginTop: 16, fontSize: 13, color: '#51cf66' }}>
            ✅ No active blockers. Rollback ready.
          </div>
        )}
      </div>
    </div>
  );
}
