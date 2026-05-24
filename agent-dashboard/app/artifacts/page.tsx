'use client';

export default function ArtifactsPage() {
  const artifacts = [
    { name: 'canvas-loaded.png', type: 'screenshot', size: '84 KB', date: '2h ago', game: 'CurrentScene' },
    { name: 'canvas-initial.png', type: 'screenshot', size: '12 KB', date: '2h ago', game: 'CurrentScene' },
    { name: 'screen-fullpage.png', type: 'screenshot', size: '156 KB', date: '2h ago', game: 'CurrentScene' },
    { name: 'e2e-after-input.png', type: 'screenshot', size: '92 KB', date: '2h ago', game: 'JumpJump' },
    { name: 'test-results.json', type: 'test-result', size: '4 KB', date: '2h ago', game: 'JumpJump' },
    { name: 'last-state.json', type: 'snapshot', size: '1 KB', date: '2h ago', game: 'JumpJump' },
    { name: 'canvas-sample.json', type: 'snapshot', size: '2 KB', date: '2h ago', game: 'JumpJump' },
    { name: 'ws-messages.jsonl', type: 'trace', size: '48 KB', date: '2h ago', game: 'JumpJump' },
    { name: 'console-dump.txt', type: 'log', size: '3 KB', date: '2h ago', game: 'CurrentScene' },
  ];

  const typeIcons: Record<string, string> = {
    screenshot: '🖼️',
    'test-result': '📊',
    snapshot: '📸',
    trace: '🔍',
    log: '📝',
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Runtime Artifacts</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>{artifacts.length} files · latest 2h ago</p>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Screenshots', value: 4, icon: '🖼️' },
          { label: 'Test Results', value: 1, icon: '📊' },
          { label: 'Snapshots', value: 2, icon: '📸' },
          { label: 'Traces', value: 1, icon: '🔍' },
          { label: 'Logs', value: 1, icon: '📝' },
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
          <div key={a.name} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 0',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 18 }}>{typeIcons[a.type] || '📄'}</span>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 13 }}>{a.name}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <span style={{
                  background: 'rgba(255,255,255,0.05)',
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  color: '#868e96',
                }}>{a.type}</span>
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
