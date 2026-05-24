'use client';

import { getCostMetrics } from '@/lib/api/cost';

export default function CostPage() {
  const m = getCostMetrics();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Token Cost</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>AI resource usage across all agents</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Tokens', value: (m.tokensTotal / 1000).toFixed(1) + 'K', color: '#51cf66' },
          { label: 'Est. Cost', value: '$' + m.costTotal.toFixed(2), color: '#ffd43b' },
          { label: 'Avg Latency', value: (m.avgLatencyMs / 1000).toFixed(1) + 's', color: '#4dabf7' },
          { label: 'Cache Hit Rate', value: (m.cacheHitRate * 100).toFixed(0) + '%', color: '#cc5de8' },
        ].map(kpi => (
          <div key={kpi.label} className="glass" style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, fontFamily: 'monospace' }}>{kpi.value}</div>
            <div style={{ fontSize: 12, color: '#868e96', marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Model breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Tokens by Model</div>
          {Object.entries(m.tokensByModel).map(([model, tokens]) => {
            const pct = ((tokens / m.tokensTotal) * 100).toFixed(0);
            return (
              <div key={model} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>{model}</span>
                  <span className="mono" style={{ fontSize: 12, color: '#868e96' }}>{(tokens / 1000).toFixed(0)}K ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: pct + '%', background: '#4dabf7', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cost by Model</div>
          {Object.entries(m.costByModel).map(([model, cost]) => {
            const pct = ((cost / m.costTotal) * 100).toFixed(0);
            return (
              <div key={model} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>{model}</span>
                  <span className="mono" style={{ fontSize: 12, color: '#868e96' }}>${cost.toFixed(3)} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: pct + '%', background: '#ffd43b', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      <div className="glass" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Cost History (24h)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 100 }}>
          {m.history.map(h => (
            <div key={h.time} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, color: '#ffd43b', fontWeight: 600 }}>${h.cost.toFixed(2)}</div>
              <div style={{ width: '100%', height: h.tokens / 400, background: 'linear-gradient(to top, rgba(81,207,102,0.4), rgba(81,207,102,0.1))', borderRadius: '4px 4px 0 0' }} />
              <div style={{ fontSize: 10, color: '#868e96' }}>{h.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
