'use client';

import { getRuntimeFailures, getFailureTrends } from '@/lib/api/runtime';

const severityColors: Record<string, string> = {
  CRITICAL: '#ff6b6b',
  HIGH: '#ff922b',
  MEDIUM: '#ffd43b',
  LOW: '#51cf66',
};

export default function RuntimePage() {
  const failures = getRuntimeFailures();
  const trends = getFailureTrends();
  const active = failures.filter(f => f.status === 'active').length;
  const critical = failures.filter(f => f.severity === 'CRITICAL').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Runtime Failures</h1>
          <p style={{ color: '#868e96', margin: '4px 0 0' }}>
            {failures.length} categories · {active} active · {critical} critical
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ background: 'rgba(81,207,102,0.15)', color: '#51cf66', padding: '4px 12px', borderRadius: 6, fontSize: 12 }}>
            MTTR: 12m avg
          </span>
          <span style={{ background: 'rgba(255,212,59,0.15)', color: '#ffd43b', padding: '4px 12px', borderRadius: 6, fontSize: 12 }}>
            0 active incidents
          </span>
        </div>
      </div>

      {/* Trend bar */}
      <div className="glass" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 13, color: '#868e96', marginBottom: 12 }}>Failure Trend (5 days)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 80 }}>
          {trends.map(t => {
            const total = t.critical + t.high + t.medium;
            const maxH = 80;
            return (
              <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{total}</div>
                <div style={{ width: '100%', height: Math.max(total * 12, 4), background: total > 3 ? '#ff6b6b' : total > 1 ? '#ffd43b' : '#51cf66', borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                <div style={{ fontSize: 10, color: '#868e96' }}>{t.date}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Failure cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
        {failures.map(f => (
          <div key={f.code} className="glass" style={{
            borderLeft: `3px solid ${severityColors[f.severity]}`,
            opacity: f.status === 'resolved' ? 0.7 : 1,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="mono" style={{ color: severityColors[f.severity], fontWeight: 700 }}>{f.code}</span>
                  <span style={{ fontWeight: 600 }}>{f.category}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{
                    background: severityColors[f.severity] + '22',
                    color: severityColors[f.severity],
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                  }}>{f.severity}</span>
                  <span style={{ fontSize: 11, color: '#868e96' }}>Count: {f.count}</span>
                  <span style={{ fontSize: 11, color: '#868e96' }}>Last: {f.lastSeen}</span>
                </div>
              </div>
              <span style={{
                background: f.status === 'resolved' ? 'rgba(81,207,102,0.15)' : 'rgba(255,107,107,0.15)',
                color: f.status === 'resolved' ? '#51cf66' : '#ff6b6b',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
              }}>{f.status.toUpperCase()}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#868e96', marginBottom: 6 }}>Recovery Plan:</div>
              {f.recoveryPlan.map((step, i) => (
                <div key={i} style={{ fontSize: 12, color: '#e9ecef', marginBottom: 2, paddingLeft: 12 }}>
                  <span style={{ color: '#868e96' }}>{i + 1}.</span> {step}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
