const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/api/chat/send/route.ts';
let content = fs.readFileSync(path, 'utf8');

// 번역 완료 후 푸시 알림 발송 추가
const pushCode = `
      // 푸시 알림 발송 (룸 참여자들에게)
      try {
        await fetch(process.env.NEXT_PUBLIC_APP_URL + '/api/push/send', {
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
  "  } catch (e: any) {\n    console.warn(`[chat/send] translate failed: ${e.message}`);\n  }",
  "  } catch (e: any) {\n    console.warn(`[chat/send] translate failed: ${e.message}`);\n  }" + pushCode
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
