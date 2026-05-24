'use client';

import { getAgents } from '@/lib/api/agents';

const typeColors: Record<string, string> = {
  orchestrator: '#4dabf7',
  build: '#ffd43b',
  test: '#20c997',
  release: '#cc5de8',
  memory: '#51cf66',
  diagnostic: '#ff922b',
  observability: '#f06595',
  runtime: '#868e96',
};

const statusIcons: Record<string, string> = {
  online: '🟢',
  idle: '⚪',
  busy: '🟡',
  error: '🔴',
};

export default function AgentsPage() {
  const agents = getAgents();
  const online = agents.filter(a => a.status === 'online' || a.status === 'busy').length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Agent Status</h1>
          <p style={{ color: '#868e96', margin: '4px 0 0' }}>
            {agents.length} agents · {online} active · 0 errors
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#51cf66' }}>{online}</div>
            <div style={{ fontSize: 11, color: '#868e96' }}>Active</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ffd43b' }}>0</div>
            <div style={{ fontSize: 11, color: '#868e96' }}>Warnings</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ff6b6b' }}>0</div>
            <div style={{ fontSize: 11, color: '#868e96' }}>Errors</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {agents.map(agent => (
          <div key={agent.name} className="glass" style={{ transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{statusIcons[agent.status]}</span>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{agent.name}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <span style={{
                    background: (typeColors[agent.type] || '#868e96') + '22',
                    color: typeColors[agent.type] || '#868e96',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                  }}>{agent.type}</span>
                  <span style={{ color: '#868e96', fontSize: 11 }}>{agent.version}</span>
                </div>
              </div>
              <span style={{
                background: agent.status === 'online' ? 'rgba(81,207,102,0.15)' :
                           agent.status === 'busy' ? 'rgba(255,212,59,0.15)' :
                           agent.status === 'error' ? 'rgba(255,107,107,0.15)' :
                           'rgba(255,255,255,0.05)',
                color: agent.status === 'online' ? '#51cf66' :
                       agent.status === 'busy' ? '#ffd43b' :
                       agent.status === 'error' ? '#ff6b6b' :
                       '#868e96',
                padding: '3px 10px',
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>{agent.status}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{agent.tasks}</div>
                <div style={{ fontSize: 10, color: '#868e96', textTransform: 'uppercase' }}>Tasks</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: agent.failures > 0 ? '#ff6b6b' : '#51cf66' }}>{agent.failures}</div>
                <div style={{ fontSize: 10, color: '#868e96', textTransform: 'uppercase' }}>Failures</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#868e96' }}>{agent.lastRun || '—'}</div>
                <div style={{ fontSize: 10, color: '#868e96', textTransform: 'uppercase' }}>Last Run</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
