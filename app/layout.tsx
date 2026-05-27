import type { Metadata, Viewport } from 'next';
import './globals.css';
import './core.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0a',
};

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'CORE-RING ENGINE',
  description: '한↔베 방언 번역기 · CoreRing – 한국어 ↔ 베트남어, 사투리까지 번역돼요 🗣️',
  openGraph: {
    title: '한↔베 방언 번역기 · CoreRing',
    description: '한국어 ↔ 베트남어, 사투리까지 번역돼요 🗣️ 남북 방언 자동 감지 · 감정 톤 분석',
    url: 'https://corering.vercel.app',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CORERING',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><script dangerouslySetInnerHTML={{ __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }` }} />{children}</body>
    </html>
  );
}