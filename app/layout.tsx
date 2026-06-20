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
  description: '?쒋넄踰?諛⑹뼵 踰덉뿭湲?쨌 CoreRing ???쒓뎅????踰좏듃?⑥뼱, ?ы닾由ш퉴吏 踰덉뿭?쇱슂 ?뿣截?,
  openGraph: {
    title: 'CoreRing - ?쒓뎅??踰좏듃?⑥뼱 踰덉뿭湲?,
    description: '?쒓뎅?댁? 踰좏듃?⑥뼱瑜?踰덉뿭?대뱶由쎈땲?? 諛⑹뼵源뚯? 吏?먰빀?덈떎.',
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
