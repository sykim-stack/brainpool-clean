const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const before = [
  "  useEffect(() => {",
  "    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;",
  "  }, [messages]);"
].join("\n");

const after = [
  "  useEffect(() => {",
  "    const el = chatRef.current;",
  "    if (!el) return;",
  "    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;",
  "    if (isNearBottom) el.scrollTop = el.scrollHeight;",
  "  }, [messages]);"
].join("\n");

if (content.includes('isNearBottom')) {
  console.log('SKIP already applied');
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK scroll fix applied');
} else {
  console.log('X target block not found - check file manually');
}
