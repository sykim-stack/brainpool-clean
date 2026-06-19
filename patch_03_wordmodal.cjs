const fs = require('fs');
const path = 'G:\\brainpool-clean\\components\\WordModal.tsx';

const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

// 1. import에 useEffect 추가
const importIdx = lines.findIndex(l => l.includes("import { useState, useRef }"));
if (importIdx === -1) {
  console.error('❌ import 라인 못 찾음');
  process.exit(1);
}
lines[importIdx] = lines[importIdx].replace(
  "import { useState, useRef }",
  "import { useState, useRef, useEffect }"
);
console.log('✅ useEffect import 추가');

// 2. useEffect 훅 추가 — sourceLang 선언 바로 다음에
const sourceLangIdx = lines.findIndex(l => l.includes('const sourceLang = data.sourceLang;'));
if (sourceLangIdx === -1) {
  console.error('❌ sourceLang 라인 못 찾음');
  process.exit(1);
}

const useEffectBlock = [
  '',
  '  // 모달 열릴 때 기존 발음 조회',
  '  useEffect(() => {',
  '    if (!word) return;',
  "    const dialect = sourceLang === 'ko' ? 'vietnamese' : 'korean';",
  "    fetch('/api/phrase', {",
  "      method: 'POST',",
  "      headers: { 'Content-Type': 'application/json; charset=utf-8' },",
  "      body: JSON.stringify({ action: 'get-audio', word, dialect }),",
  '    })',
  '      .then(r => r.json())',
  '      .catch(() => null)',
  '      .then(json => {',
  '        if (json?.payload?.audio_url) {',
  '          setAudioUrl(json.payload.audio_url);',
  '        }',
  '      });',
  '  }, [word]);',
];

lines.splice(sourceLangIdx + 1, 0, ...useEffectBlock);
fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('✅ WordModal.tsx 수정 완료');