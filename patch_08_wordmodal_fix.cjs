const fs = require('fs');
const path = 'G:\\brainpool-clean\\components\\WordModal.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

// 제거할 블록 (return null 이후에 있는 useEffect)
const wrongBlock = `
  // 모달 열릴 때 기존 발음 조회
  useEffect(() => {
    if (!word) return;
    const dialect = sourceLang === 'ko' ? 'vietnamese' : 'korean';
    fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'get-audio', word, dialect }),
    })
      .then(r => r.json())
      .catch(() => null)
      .then(json => {
        if (json?.payload?.audio_url) {
          setAudioUrl(json.payload.audio_url);
        }
      });
  }, [word]);`;

if (!src.includes(wrongBlock)) {
  console.error('❌ 제거 대상 블록 못 찾음');
  process.exit(1);
}

// 1. 잘못된 위치에서 제거
src = src.replace(wrongBlock, '');
console.log('✅ 잘못된 위치 useEffect 제거');

// 2. return null 앞에 삽입 (streamRef 선언 바로 다음, return null 바로 앞)
const insertTarget = `  if (!data) return null;`;
const insertContent = `  // 모달 열릴 때 기존 발음 조회 (return null 이전에 위치해야 함 - Hook 규칙)
  const word_for_effect = data?.sentence || '';
  const sourceLang_for_effect = data?.sourceLang || '';
  useEffect(() => {
    if (!word_for_effect) return;
    const dialect = sourceLang_for_effect === 'ko' ? 'vietnamese' : 'korean';
    fetch('/api/phrase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ action: 'get-audio', word: word_for_effect, dialect }),
    })
      .then(r => r.json())
      .catch(() => null)
      .then(json => {
        if (json?.payload?.audio_url) {
          setAudioUrl(json.payload.audio_url);
        }
      });
  }, [word_for_effect]);

  `;

if (!src.includes(insertTarget)) {
  console.error('❌ 삽입 위치 못 찾음');
  process.exit(1);
}

src = src.replace(insertTarget, insertContent + insertTarget);
fs.writeFileSync(path, src, 'utf8');
console.log('✅ useEffect return null 앞으로 이동 완료');