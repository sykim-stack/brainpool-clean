const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\page.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const kakaoBlock1 = `  // 카카오 인앱브라우저 → 외부 브라우저 강제 탈출 (페이지 진입 시)
  useEffect(() => {
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href =
        'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
    }
  }, []);

  `;

while (src.includes(kakaoBlock1)) {
  src = src.replace(kakaoBlock1, '');
  console.log('🗑️ 카카오 블록 제거');
}

fs.writeFileSync(path, src, 'utf8');
console.log('✅ 완료');