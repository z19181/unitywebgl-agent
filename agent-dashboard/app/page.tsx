'use client';

import { getAgents } from '@/lib/api/agents';
import { getCostMetrics } from '@/lib/api/cost';
import { getRuntimeFailures } from '@/lib/api/runtime';
import { getBuilds } from '@/lib/api/builds';

export default function OverviewPage() {
  const agents = getAgents();
  const cost = getCostMetrics();
  const failures = getRuntimeFailures();
  const builds = getBuilds();

  const online = agents.filter(a => a.status === 'online' || a.status === 'busy').length;
  const criticalFailures = failures.filter(f => f.severity === 'CRITICAL' && f.status === 'active').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>
          🎮 PartyGameSDK
          <span style={{ fontSize: 16, color: '#868e96', fontWeight: 400, marginLeft: 12 }}>Agent Intelligence Console</span>
        </h1>
        <p style={{ color: '#495057', margin: '4px 0 0', fontSize: 13 }}>
          Runtime Console — {online}/{agents.length} agents online — {criticalFailures} active incidents
        </p>
      </div>

      {/* Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Agents Online', value: online + '/' + agents.length, color: '#51cf66', link: '/agents' },
          { label: 'Runtime Failures', value: criticalFailures + ' active', color: criticalFailures > 0 ? '#ff6b6b' : '#51cf66', link: '/runtime' },
          { label: 'Daily Cost', value: '$' + cost.costTotal.toFixed(2), color: '#ffd43b', link: '/cost' },
          { label: 'RAG Queries', value: '85 total', color: '#4dabf7', link: '/rag' },
          { label: 'Builds Passing', value: builds.filter(b => b.status === 'passed').length + '/' + builds.length, color: '#51cf66', link: '/builds' },
          { label: 'Release Gates', value: '7/7 PASS', color: '#51cf66', link: '/release' },
        ].map(kpi => (
          <a key={kpi.label} href={kpi.link} style={{ textDecoration: 'none' }}>
            <div className="glass" style={{
              textAlign: 'center',
              padding: 20,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: kpi.color, fontFamily: 'monospace' }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: '#868e96', marginTop: 4 }}>{kpi.label}</div>
            </div>
          </a>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Agent Activity</div>
          {agents.filter(a => a.lastRun).slice(0, 5).map(a => (
            <div key={a.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: a.status === 'online' ? '#51cf66' : a.status === 'busy' ? '#ffd43b' : '#868e96',
                }} />
                <span style={{ fontSize: 13 }}>{a.name}</span>
              </div>
              <span style={{ fontSize: 11, color: '#868e96' }}>{a.lastRun}</span>
            </div>
          ))}
        </div>

        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Build Status</div>
          {builds.slice(0, 5).map(b => (
            <div key={b.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{b.status === 'passed' ? '✅' : '⏳'}</span>
                <span style={{ fontSize: 13 }}>{b.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 11, color: '#51cf66' }}>{b.checks}</span>
                <span style={{ fontSize: 11, color: '#868e96' }}>{b.lastBuild}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#495057' }}>
        PartyGameSDK Agent Intelligence Layer v1.1.2 · {agents.length} agents · Commit 9832c92
      </div>
    </div>
  );
}
