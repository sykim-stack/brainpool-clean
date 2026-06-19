const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\page.tsx';

const src = fs.readFileSync(path, 'utf8');

const target = `  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);`;

const replacement = `  // 카카오 인앱브라우저 → 외부 브라우저 강제 탈출 (페이지 진입 시)
  useEffect(() => {
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href =
        'kakaotalk://web/openExternal?url=' + encodeURIComponent(window.location.href);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);`;

// 줄바꿈 정규화 후 비교
const normalized = src.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (!normalized.includes(normalizedTarget)) {
  console.error('❌ 대상 블록 못 찾음');
  process.exit(1);
}

fs.writeFileSync(path, normalized.replace(normalizedTarget, replacement), 'utf8');
console.log('✅ 카카오 인앱 진입 탈출 추가 완료');