const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// import 추가
content = content.replace(
  "import CorePhrase from '@/components/CorePhrase';",
  "import CorePhrase from '@/components/CorePhrase';\nimport ShareRoomModal from '@/components/ShareRoomModal';"
);

// state 추가
content = content.replace(
  "const [showRoomBanner, setShowRoomBanner] = useState(false);",
  "const [showRoomBanner, setShowRoomBanner] = useState(false);\n  const [shareRoomCode, setShareRoomCode] = useState<string | null>(null);"
);

// 방 생성 후 모달 표시 - handleSend
content = content.replace(
  "        setCurrentRoomCode(data.payload.room.inviteCode || '------');\n        saveMyRoom(data.payload.room);\n        loadRooms();\n        await sendMessageToRoom(newRoomId, text);",
  "        setCurrentRoomCode(data.payload.room.inviteCode || '------');\n        saveMyRoom(data.payload.room);\n        loadRooms();\n        setShareRoomCode(data.payload.room.inviteCode);\n        await sendMessageToRoom(newRoomId, text);"
);

// RoomList onCreateRoom 후 모달 표시
content = content.replace(
  "            setCurrentRoomId(data.payload.room.roomId);\n            setCurrentRoomCode(data.payload.room.inviteCode || '------');\n            saveMyRoom(data.payload.room); // ← 추가\n            setIsRoomMode(false);",
  "            setCurrentRoomId(data.payload.room.roomId);\n            setCurrentRoomCode(data.payload.room.inviteCode || '------');\n            saveMyRoom(data.payload.room);\n            setShareRoomCode(data.payload.room.inviteCode);\n            setIsRoomMode(false);"
);

// ShareRoomModal 추가 (WordModal 위에)
content = content.replace(
  "      <WordModal",
  `      {shareRoomCode && (
        <ShareRoomModal
          roomCode={shareRoomCode}
          onClose={() => setShareRoomCode(null)}
        />
      )}

      <WordModal`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('ShareRoomModal') ? '성공' : '실패');
