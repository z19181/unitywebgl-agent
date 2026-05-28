'use client';

import { useEffect, useState } from 'react';
import { getDashboardHealth } from '@/lib/metrics-client';

interface Artifact {
  name: string;
  type: string;
  size: string;
  date: string;
  game: string;
}

const MOCK_ARTIFACTS: Artifact[] = [
  { name: 'canvas-loaded.png',        type: 'screenshot',   size: '84 KB',  date: '2h ago',  game: 'CurrentScene' },
  { name: 'canvas-initial.png',       type: 'screenshot',   size: '12 KB',  date: '2h ago',  game: 'CurrentScene' },
  { name: 'screen-fullpage.png',      type: 'screenshot',   size: '156 KB', date: '2h ago',  game: 'CurrentScene' },
  { name: 'e2e-after-input.png',     type: 'screenshot',   size: '92 KB',  date: '2h ago',  game: 'JumpJump' },
  { name: 'test-results.json',        type: 'test-result',   size: '4 KB',   date: '2h ago',  game: 'JumpJump' },
  { name: 'last-state.json',          type: 'snapshot',       size: '1 KB',   date: '2h ago',  game: 'JumpJump' },
  { name: 'canvas-sample.json',        type: 'snapshot',       size: '2 KB',   date: '2h ago',  game: 'JumpJump' },
  { name: 'ws-messages.jsonl',       type: 'trace',          size: '48 KB',  date: '2h ago',  game: 'JumpJump' },
  { name: 'console-dump.txt',         type: 'log',            size: '3 KB',   date: '2h ago',  game: 'CurrentScene' },
];

const typeIcons: Record<string, string> = {
  screenshot:   '🖼️',
  'test-result': '📊',
  snapshot:     '📸',
  trace:        '🔍',
  log:          '📝',
};

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // v1.1.3: artifacts still mock; real from Prometheus/minIO in v1.1.4
      Promise.resolve(MOCK_ARTIFACTS),
      getDashboardHealth(),
    ]).then(([a, h]) => {
      setArtifacts(a);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: 24, color: '#868e96' }}>Loading…</div>;

  const summary = (type: string) => artifacts.filter(a => a.type === type).length;

  return (
    <div style={{ padding: 24 }}>
      {health?.metricsSource === 'mock' && (
        <div style={{ background: 'rgba(255,212,59,0.1)', border: '1px solid rgba(255,212,59,0.3)', color: '#ffd43b', padding: '6px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
          ⚠ Mock Mode
        </div>
      )}

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Runtime Artifacts</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>{artifacts.length} files · latest 2h ago
        {health && (
          <span style={{ marginLeft: 12, fontSize: 11, color: '#868e96' }}>
            metrics: <span style={{ color: health.metricsSource === 'prometheus' ? '#51cf66' : '#ffd43b' }}>{health.metricsSource}</span>
          </span>
        )}
      </p>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Screenshots', value: summary('screenshot'),   icon: '🖼️' },
          { label: 'Test Results', value: summary('test-result'), icon: '📊' },
          { label: 'Snapshots',   value: summary('snapshot'),     icon: '📸' },
          { label: 'Traces',       value: summary('trace'),        icon: '🔍' },
          { label: 'Logs',         value: summary('log'),          icon: '📝' },
        ].map(s => (
          <div key={s.label} className="glass" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: 32 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#868e96' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* File list */}
      <div className="glass">
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Files</div>
        {artifacts.map(a => (
          <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 18 }}>{typeIcons[a.type] || '📄'}</span>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 13 }}>{a.name}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <span style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 3, fontSize: 10, color: '#868e96' }}>{a.type}</span>
                <span style={{ fontSize: 10, color: '#868e96' }}>{a.game}</span>
              </div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: '#868e96' }}>{a.size}</span>
            <span style={{ fontSize: 11, color: '#495057', width: 50, textAlign: 'right' }}>{a.date}</span>
          </div>
        ))}
      </div>

      {/* Retention note */}
      <div style={{ marginTop: 16, fontSize: 11, color: '#495057', textAlign: 'center' }}>
        Per-run artifacts overwritten. Failures retained 30 days. See docs/RUNTIME_ARTIFACT_POLICY.md
      </div>
    </div>
  );
}
