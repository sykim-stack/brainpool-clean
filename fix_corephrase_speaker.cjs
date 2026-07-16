const fs = require("fs");
const path = "components/CorePhrase.tsx";
let content = fs.readFileSync(path, "utf8");

const before = [
  "                      <span className={styles.word}>{item.word}</span>",
  "                      <button onClick={(e) => { e.stopPropagation(); if (typeof window !== 'undefined' && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(item.word); u.lang = 'vi-VN'; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.7 }}>🔊</button>"
].join("\n");

const after = [
  "                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>",
  "                        <span className={styles.word}>{item.word}</span>",
  "                        <button onClick={(e) => { e.stopPropagation(); if (typeof window !== 'undefined' && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(item.word); u.lang = 'vi-VN'; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: 0.7, flexShrink: 0 }}>🔊</button>",
  "                      </div>"
].join("\n");

if (content.includes(after)) {
  console.log("SKIP 이미 적용됨 (리스트 카드)");
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, "utf8");
  console.log("OK 리스트 카드 단어+스피커 한 줄 정렬 완료");
} else {
  console.log("X 리스트 카드 대상 문자열 못 찾음");
}

const flipBefore = [
  "              <p className={styles.flipWord}>{currentCard?.word}</p>",
  "              <p className={styles.flipHint}>탭해서 한국어 확인</p>",
  "              <button",
  "                onClick={(e) => { e.stopPropagation(); if (typeof window !== 'undefined' && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(currentCard?.word || ''); u.lang = 'vi-VN'; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }}",
  "                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginTop: '8px' }}",
  "              >🔊</button>"
].join("\n");

const flipAfter = [
  "              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>",
  "                <p className={styles.flipWord} style={{ margin: 0 }}>{currentCard?.word}</p>",
  "                <button",
  "                  onClick={(e) => { e.stopPropagation(); if (typeof window !== 'undefined' && window.speechSynthesis) { const u = new SpeechSynthesisUtterance(currentCard?.word || ''); u.lang = 'vi-VN'; u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } }}",
  "                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '22px', flexShrink: 0 }}",
  "                >🔊</button>",
  "              </div>",
  "              <p className={styles.flipHint}>탭해서 한국어 확인</p>"
].join("\n");

if (content.includes(flipAfter)) {
  console.log("SKIP 이미 적용됨 (플립카드)");
} else if (content.includes(flipBefore)) {
  content = content.replace(flipBefore, flipAfter);
  fs.writeFileSync(path, content, "utf8");
  console.log("OK 플립카드 단어+스피커 정렬 완료 (힌트는 그 아래로)");
} else {
  console.log("X 플립카드 대상 문자열 못 찾음");
}
