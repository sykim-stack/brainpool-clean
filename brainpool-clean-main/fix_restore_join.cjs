const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const anchor = "  const useEffect(() => {";

if (!content.includes(anchor)) {
  console.log('X anchor not found - nothing to fix, check manually');
  process.exit(1);
}

const restored = [
  "  const handleJoinByCode = useCallback(async (inviteCode: string) => {",
  "    const res = await fetch('/api/chat', {",
  "      method: 'POST',",
  "      headers: { 'Content-Type': 'application/json; charset=utf-8' },",
  "      body: JSON.stringify({ action: 'join', inviteCode }),",
  "    }).catch(() => null);",
  "",
  "    const data = res ? await res.json().catch(() => null) : null;",
  "    if (data && data.payload && data.payload.room) {",
  "      setCurrentRoomId(data.payload.room.roomId);",
  "      setCurrentRoomCode(data.payload.room.inviteCode || '------');",
  "      saveMyRoom(data.payload.room);",
  "      setShareRoomCode(data.payload.room.inviteCode || null);",
  "      setIsRoomMode(false);",
  "    } else {",
  "      alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');",
  "    }",
  "  }, []);",
  "",
  "  // -- URL 딥링크 처리 (초대링크 ?code=, 알림 ?room=) -----------------",
  "  useEffect(() => {"
].join("\n");

content = content.replace(anchor, restored);
fs.writeFileSync(path, content, 'utf8');
console.log('OK handleJoinByCode restored, useEffect syntax fixed');
