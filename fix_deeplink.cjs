const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const anchor = "  const handleJoinByCode = useCallback(async (inviteCode: string) => {";

if (!content.includes('URL 딥링크 처리')) {
  if (!content.includes(anchor)) {
    console.log('X anchor not found - aborting, no changes made');
    process.exit(1);
  }

  const lines = [
    "  // -- URL 딥링크 처리 (초대링크 ?code=, 알림 ?room=) -----------------",
    "  useEffect(() => {",
    "    const params = new URLSearchParams(window.location.search);",
    "    const code = params.get('code');",
    "    const roomParam = params.get('room');",
    "",
    "    if (code) {",
    "      handleJoinByCode(code.toUpperCase());",
    "      window.history.replaceState({}, '', window.location.pathname);",
    "    } else if (roomParam) {",
    "      (async () => {",
    "        const res = await fetch('/api/chat/rooms/' + roomParam).catch(() => null);",
    "        const data = res ? await res.json().catch(() => null) : null;",
    "        if (data && data.payload && data.payload.room) {",
    "          setMessages([]);",
    "          setCurrentRoomId(data.payload.room.roomId);",
    "          setCurrentRoomCode(data.payload.room.inviteCode || '------');",
    "          saveMyRoom(data.payload.room);",
    "        }",
    "        window.history.replaceState({}, '', window.location.pathname);",
    "      })();",
    "    }",
    "  }, []); // eslint-disable-line react-hooks/exhaustive-deps",
    "",
    ""
  ].join("\n");

  content = content.replace(anchor, lines + anchor);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK deep link useEffect inserted');
} else {
  console.log('SKIP already applied');
}
