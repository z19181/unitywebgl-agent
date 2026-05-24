import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PartyGameSDK — Agent Dashboard',
  description: 'AI Runtime Console for PartyGameSDK Agent Intelligence Layer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          background: 'rgba(10,10,15,0.95)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          padding: '0 20px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/" style={{
              fontWeight: 700,
              fontSize: 16,
              color: '#51cf66',
              textDecoration: 'none',
              letterSpacing: '-0.5px',
            }}>
              🎮 PartyGameSDK
            </a>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                ['/agents', 'Agents'],
                ['/runtime', 'Runtime'],
                ['/cost', 'Cost'],
                ['/rag', 'RAG'],
                ['/builds', 'Builds'],
                ['/release', 'Release'],
                ['/artifacts', 'Artifacts'],
              ].map(([href, label]) => (
                <a key={href} href={href} style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  color: '#868e96',
                  textDecoration: 'none',
                  fontSize: 13,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#e9ecef'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#868e96'; }}
                >{label}</a>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#495057' }}>v1.1.2</span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#51cf66',
              boxShadow: '0 0 8px rgba(81,207,102,0.5)',
            }} />
            <span style={{ fontSize: 12, color: '#51cf66' }}>ONLINE</span>
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 52px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
