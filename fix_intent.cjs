const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ShareRoomModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const handleShare = async () => {",
  `  const isKakao = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('kakaotalk');
  };

  const handleShare = async () => {`
);

content = content.replace(
  "    if (navigator.share) {",
  `    // 카카오 인앱이면 외부 브라우저로 강제 열기
    const shareUrl = 'https://corering.vercel.app?code=' + roomCode;
    const intentUrl = 'intent://' + shareUrl.replace('https://', '') + '#Intent;scheme=https;package=com.android.chrome;end';
    
    if (navigator.share) {`
);

content = content.replace(
  "        text: `CoreRing에서 대화해요!\\n방 코드: ${roomCode}\\n크롬 브라우저로 열어주세요 👇\\nhttps://corering.vercel.app`,\n        url: 'https://corering.vercel.app',",
  "        text: `CoreRing에서 대화해요! 방 코드: ${roomCode}`,\n        url: intentUrl,"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
