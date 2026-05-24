'use client';

import { getRAGQueries, getRAGCategories } from '@/lib/api/rag';

const catColors: Record<string, string> = {
  governance: '#51cf66', 'material-failure': '#ff6b6b', 'build-failure': '#ffd43b',
  'runtime-e2e': '#4dabf7', 'websocket-failure': '#ff922b', release: '#cc5de8',
  'wasm-failure': '#20c997', general: '#868e96',
};

export default function RAGPage() {
  const queries = getRAGQueries();
  const categories = getRAGCategories();
  const total = categories.reduce((s, c) => s + c.count, 0);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>RAG Retrieval</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>{queries.length} recent queries · {total} total retrievals</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Categories */}
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Semantic Categories</div>
          {categories.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
              <span className="mono" style={{ fontSize: 12, color: '#868e96' }}>{c.count}</span>
              <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: (c.count / total * 100) + '%', background: c.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent queries */}
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Queries</div>
          {queries.map(q => (
            <div key={q.id} style={{
              padding: '10px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="mono" style={{ color: '#4dabf7' }}>&quot;{q.query}&quot;</span>
                <span style={{ fontSize: 11, color: '#868e96' }}>{q.timestamp}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  background: (catColors[q.category] || '#868e96') + '22',
                  color: catColors[q.category] || '#868e96',
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                }}>{q.category}</span>
                <span style={{ fontSize: 11, color: '#868e96' }}>
                  {q.results} results · top: {q.topDoc}
                </span>
                <span style={{ fontSize: 11, color: '#51cf66' }}>
                  {(q.relevance * 100).toFixed(0)}% match
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
