const fs = require("fs");
const path = "components/WordModal.tsx";
let content = fs.readFileSync(path, "utf8");

const before = [
  "        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>",
  "          <h2 className={styles.title}>📖 {word}</h2>",
  "          <button",
  "            onClick={handlePlayAudio}",
  "            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: audioUrl ? 1 : 0.5 }}",
  "            title={audioUrl ? '원어민 발음' : '기계음 발음 (TTS)'}",
  "          >🔊</button>",
  "        </div>"
].join("\n");

const after = [
  "        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>",
  "          <h2 className={styles.title}>📖 {word}</h2>",
  "          <button",
  "            onClick={handlePlayAudio}",
  "            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', opacity: audioUrl ? 1 : 0.5, minWidth: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}",
  "            title={audioUrl ? '원어민 발음' : '기계음 발음 (TTS)'}",
  "          >🔊</button>",
  "        </div>"
].join("\n");

if (content.includes(after)) {
  console.log("SKIP 이미 적용됨");
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, "utf8");
  console.log("OK WordModal 상단 스피커 터치영역 확보 완료");
} else {
  console.log("X 대상 문자열 못 찾음");
}
