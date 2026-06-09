const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/components/ShareRoomModal.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const handleShare = async () => {\n    if (navigator.share) {\n      await navigator.share({\n        title: 'CoreRing 채팅방 초대',\n        text: `방 코드: ${roomCode}`,\n        url: 'https://corering.vercel.app',\n      }).catch(() => null);\n    } else {\n      handleCopy();\n    }\n  };",
  "  const handleShare = async () => {\n    if (navigator.share) {\n      await navigator.share({\n        title: 'CoreRing 채팅방 초대',\n        text: `CoreRing에서 대화해요!\\n방 코드: ${roomCode}\\n크롬 브라우저로 열어주세요 👇\\nhttps://corering.vercel.app`,\n        url: 'https://corering.vercel.app',\n      }).catch(() => null);\n    } else {\n      handleCopy();\n    }\n  };"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
