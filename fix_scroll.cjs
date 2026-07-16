const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = `  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);`;

const after = `  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);`;

if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✅ 스크롤 근처일 때만 auto-scroll 적용 완료');
} else if (content.includes('isNearBottom')) {
  console.log('⏭️ 이미 적용되어 있음 (스킵)');
} else {
  console.log('❌ 대상 문자열을 찾지 못함 — 기존 useEffect 확인 필요');
}
