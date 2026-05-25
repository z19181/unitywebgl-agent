import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
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
        <Navbar />
        <main style={{ minHeight: 'calc(100vh - 52px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
