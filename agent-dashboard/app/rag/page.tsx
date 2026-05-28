'use client';

import { useEffect, useState } from 'react';
import { getRAGQueries, getRAGCategories, getDashboardHealth } from '@/lib/metrics-client';

type Query = Awaited<ReturnType<typeof getRAGQueries>>[number];
type Category = Awaited<ReturnType<typeof getRAGCategories>>[number];

const catColors: Record<string, string> = {
  governance: '#51cf66', 'material-failure': '#ff6b6b', 'build-failure': '#ffd43b',
  'runtime-e2e': '#4dabf7', 'websocket-failure': '#ff922b', release: '#cc5de8',
  'wasm-failure': '#20c997', general: '#868e96',
};

export default function RAGPage() {
  const [queries, setQueries] = useState<Query[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getRAGQueries(), getRAGCategories(), getDashboardHealth()])
      .then(([q, c, h]) => {
        setQueries(q);
        setCategories(c);
        setHealth(h);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 24, color: '#868e96' }}>Loading…</div>;

  const total = categories.reduce((s: number, c: any) => s + c.count, 0);

  return (
    <div style={{ padding: 24 }}>
      {health?.metricsSource === 'mock' && (
        <div style={{ background: 'rgba(255,212,59,0.1)', border: '1px solid rgba(255,212,59,0.3)', color: '#ffd43b', padding: '6px 12px', borderRadius: 6, fontSize: 12, marginBottom: 16, display: 'inline-block' }}>
          ⚠ Mock Mode
        </div>
      )}

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>RAG Retrieval</h1>
      <p style={{ color: '#868e96', margin: '0 0 24px' }}>
        {queries.length} recent queries · {total} total retrievals
        {health && (
          <span style={{ marginLeft: 12, fontSize: 11, color: '#868e96' }}>
            metrics: <span style={{ color: health.metricsSource === 'prometheus' ? '#51cf66' : '#ffd43b' }}>{health.metricsSource}</span>
          </span>
        )}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Categories */}
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Semantic Categories</div>
          {categories.map((c: any) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: (catColors as any)[c.name] || '#868e96', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13 }}>{c.name}</span>
              <span className="mono" style={{ fontSize: 12, color: '#868e96' }}>{c.count}</span>
              <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: total > 0 ? (c.count / total * 100) + '%' : '0%', background: (catColors as any)[c.name] || '#868e96', borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent queries */}
        <div className="glass">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Recent Queries</div>
          {queries.map((q: any) => (
            <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="mono" style={{ color: '#4dabf7' }}>&quot;{q.query}&quot;</span>
                <span style={{ fontSize: 11, color: '#868e96' }}>{q.timestamp}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ background: (((catColors as any)[q.category] || '#868e96') + '22'), color: ((catColors as any)[q.category] || '#868e96'), padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>{q.category}</span>
                <span style={{ fontSize: 11, color: '#868e96' }}>{q.results} results · top: {q.topDoc}</span>
                <span style={{ fontSize: 11, color: '#51cf66' }}>{(q.relevance * 100).toFixed(0)}% match</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
