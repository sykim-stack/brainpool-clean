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
    title: 'CoreRing - 한국어 베트남어 번역기',
    description: '한국어와 베트남어를 번역해드립니다. 방언까지 지원합니다.',
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