const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const anchor = `  const handleJoinByCode = useCallback(async (inviteCode: string) => {`;

if (!content.includes('URL 딥링크 처리')) {
  const deepLinkEffect = `  // ── URL 딥링크 처리 (초대링크 ?code=, 알림 ?room=) ─────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const roomParam = params.get('room');

    if (code) {
      handleJoinByCode(code.toUpperCase());
      window.history.replaceState({}, '', window.location.pathname);
    } else if (roomParam) {
      (async () => {
        const res = await fetch(\`/api/chat/rooms/\${roomParam}\`).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.payload?.room) {
          setMessages([]);
          setCurrentRoomId(data.payload.room.roomId);
          setCurrentRoomCode(data.payload.room.inviteCode || '------');
          saveMyRoom(data.payload.room);
        }
        window.history.replaceState({}, '', window.location.pathname);
      })();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

`;
  content = content.replace(anchor, deepLinkEffect + anchor);
  fs.writeFileSync(path, content, 'utf8');
  console.log('✅ 딥링크 useEffect 삽입 완료');
} else {
  console.log('⏭️ 이미 적용되어 있음 (스킵)');
}
