const fs = require('fs');
const path = 'G:\\brainpool-clean\\components\\ChatBubble.tsx';

const src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

const oldBlock = [
  '        {audioUrl && (',
  '          <button',
  '            onClick={(e) => {',
  '              e.stopPropagation();',
  '              // iOS 호환 재생',
  '              const audio = document.createElement(\'audio\');',
  '              audio.src = audioUrl;',
  '              audio.controls = false;',
  '              (audio as any).playsInline = true;',
  '              document.body.appendChild(audio);',
  '              audio.play().catch(() => { window.open(audioUrl, \'_blank\'); });',
  '              audio.onended = () => document.body.removeChild(audio);',
  '            }}',
  '            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}',
  '          >🔊</button>',
  '        )}',
].join('\n');

const newBlock = [
  '        <button',
  '          onClick={(e) => {',
  '            e.stopPropagation();',
  '            if (audioUrl) {',
  '              // 원어민 발음 재생',
  '              const audio = document.createElement(\'audio\');',
  '              audio.src = audioUrl;',
  '              audio.controls = false;',
  '              (audio as any).playsInline = true;',
  '              document.body.appendChild(audio);',
  '              audio.play().catch(() => { window.open(audioUrl, \'_blank\'); });',
  '              audio.onended = () => document.body.removeChild(audio);',
  '            } else if (typeof window !== \'undefined\' && window.speechSynthesis) {',
  '              // TTS fallback',
  '              const utterance = new SpeechSynthesisUtterance(translated);',
  '              utterance.lang = targetLang === \'vi\' ? \'vi-VN\' : \'ko-KR\';',
  '              utterance.rate = 0.9;',
  '              window.speechSynthesis.cancel();',
  '              window.speechSynthesis.speak(utterance);',
  '            }',
  '          }}',
  '          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", padding: "0 4px", opacity: audioUrl ? 1 : 0.5 }}',
  '          title={audioUrl ? \'원어민 발음\' : \'기계음 발음 (TTS)\'}',
  '        >🔊</button>',
].join('\n');

if (!src.includes(oldBlock)) {
  console.error('❌ 교체 대상 블록 못 찾음');
  process.exit(1);
}

const finalSrc = src.replace(oldBlock, newBlock);
fs.writeFileSync(path, finalSrc, 'utf8');
console.log('✅ ChatBubble TTS fallback 추가 완료');