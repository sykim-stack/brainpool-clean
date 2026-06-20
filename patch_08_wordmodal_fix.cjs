const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\layout.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldOG = `  openGraph: {
    title: '한↔베 방언 번역기 · CoreRing',
    description: '한국어 ↔ 베트남어, 사투리까지 번역돼요 🗣️ 남북 방언 자동 감지 · 감정 톤 분석',
    url: 'https://corering.vercel.app',
    type: 'website',
  },`;

const newOG = `  openGraph: {
    title: 'CoreRing - 한국어 베트남어 번역기',
    description: '한국어와 베트남어를 번역해드립니다. 방언까지 지원합니다.',
    url: 'https://corering.vercel.app',
    type: 'website',
  },`;

if (!src.includes(oldOG)) {
  console.error('❌ OG 블록 못 찾음');
  process.exit(1);
}

src = src.replace(oldOG, newOG);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ OG 태그 특수문자 제거 완료');