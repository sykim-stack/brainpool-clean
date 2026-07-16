const fs = require('fs');
const path = 'app/page.tsx';
let content = fs.readFileSync(path, 'utf8');
let changed = false;

// 버그1: 초대링크로 방 참여 시 공유모달 불필요하게 뜨는 것 방지
const shareBefore = [
  "      saveMyRoom(data.payload.room);",
  "      setShareRoomCode(data.payload.room.inviteCode || null);",
  "      setIsRoomMode(false);",
  "    } else {",
  "      alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');",
  "    }",
  "  }, []);"
].join("\n");

const shareAfter = [
  "      saveMyRoom(data.payload.room);",
  "      setIsRoomMode(false);",
  "    } else {",
  "      alert('방을 찾을 수 없습니다. 코드를 확인해주세요.');",
  "    }",
  "  }, []);"
].join("\n");

if (content.includes(shareBefore)) {
  content = content.replace(shareBefore, shareAfter);
  changed = true;
  console.log('OK 버그1 수정: handleJoinByCode에서 공유모달 호출 제거');
} else if (!content.includes("setShareRoomCode(data.payload.room.inviteCode || null);\n      setIsRoomMode(false);")) {
  console.log('SKIP 버그1: 이미 적용되어 있거나 대상 없음');
} else {
  console.log('X 버그1: 대상 문자열 못 찾음');
}

fs.writeFileSync(path, content, 'utf8');
