// modules/proactive-alert-layer.js (안전 버전)
const MAX_DAILY_ALERTS = 3;
let todayAlertCount = 0;
let lastAlertDate = new Date().toDateString();

function resetDailyCount() {
  const today = new Date().toDateString();
  if (today !== lastAlertDate) {
    todayAlertCount = 0;
    lastAlertDate = today;
  }
}

function canSendAlert() {
  resetDailyCount();
  return todayAlertCount < MAX_DAILY_ALERTS;
}

function createNotification({ title, message }) {
  if (!canSendAlert()) {
    console.warn('[ProactiveAlert] 일일 알림 한도 초과');
    return false;
  }

  try {
    chrome.notifications.create({
      type: 'basic',
      title: title,
      message: message,
      requireInteraction: true,
      priority: 2,
    });
    todayAlertCount++;
    return true;
  } catch (e) {
    console.error('[ProactiveAlert] 알림 생성 실패:', e.message);
    return false;
  }
}

export async function ProactiveAlertLayer(ctx) {
  if (!ctx || ctx._error) return ctx;
  if (!ctx.event) return ctx;

  const { event } = ctx;
  let sent = false;

  switch (event.type) {
    case 'system.degraded':
      sent = createNotification({
        title: '⚠️ BRAINPOOL 장애',
        message: `${event.module} 상태 불량. 지금 확인하세요.`,
      });
      break;
    case 'care.imminent':
      sent = createNotification({
        title: '🏥 오늘의 일정',
        message: `오늘은 ${event.title} 가는 날입니다.`,
      });
      break;
    case 'care.reminder':
      sent = createNotification({
        title: '🔔 내일 예정',
        message: `내일은 ${event.title} 예정입니다.`,
      });
      break;
  }

  ctx.notificationSent = sent;
  return ctx;
}