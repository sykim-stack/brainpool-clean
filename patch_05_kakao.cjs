const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\page.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 카카오 탈출 블록 전체 제거 (중복 포함)
const kakaoBlock = `  // 카카오 인앱브라우저 → 외부 브라우저 강제 탈출 (페이지 진입 시)
  useEffect(() => {
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href =
        'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
    }
  }, []);\n\n`;

// 있는 만큼 전부 제거
while (src.includes(kakaoBlock)) {
  src = src.replace(kakaoBlock, '');
  console.log('🗑️ 카카오 블록 하나 제거');
}

// beforeinstallprompt useEffect 앞에 딱 한 번만 삽입
const insertTarget = `  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {`;

const insertContent = `  // 카카오 인앱브라우저 → 외부 브라우저 강제 탈출 (페이지 진입 시)
  useEffect(() => {
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href =
        'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
    }
  }, []);

  `;

if (!src.includes(insertTarget)) {
  console.error('❌ 삽입 위치 못 찾음');
  process.exit(1);
}

src = src.replace(insertTarget, insertContent + insertTarget);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ 카카오 탈출 블록 정리 완료 (1개만)');