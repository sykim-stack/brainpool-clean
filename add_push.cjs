const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/api/chat/send/route.ts';
let content = fs.readFileSync(path, 'utf8');

const pushCode = `
    // 푸시 알림 발송
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://corering.vercel.app';
      await fetch(appUrl + '/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          sender_id: userId,
          title: 'CoreRing',
          body: original.length > 50 ? original.slice(0, 50) + '...' : original,
          url: '/',
        }),
      }).catch(() => null);
    } catch (e) {}
`;

content = content.replace(
  "  try {\n    const { ChatMessageEngine }",
  pushCode + "\n  try {\n    const { ChatMessageEngine }"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
console.log('push 있음:', content.includes('push'));
