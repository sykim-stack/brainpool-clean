const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// useState 아래에 구독 함수 추가
const subscribeCode = `
  const subscribePush = async (deviceId) => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: deviceId, subscription: sub }),
      });
      console.log('[Push] 구독 완료');
    } catch (e) {
      console.warn('[Push] 구독 실패:', e);
    }
  };
`;

content = content.replace(
  "const getDeviceId = () => {",
  subscribeCode + "\nconst getDeviceId = () => {"
);

// useEffect에 구독 추가
content = content.replace(
  "useEffect(() => { loadRooms(); }, [loadRooms]);",
  `useEffect(() => { loadRooms(); }, [loadRooms]);

  useEffect(() => {
    if (!deviceId) return;
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') subscribePush(deviceId);
    });
  }, [deviceId]);`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
