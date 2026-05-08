// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer / Sub: Presence Layer
// ============================================================
// 위치: brain-engine/layers/sub/chat-presence-layer.js
// 역할: 사용자 접속 상태 추적, 마지막 활동 시간
// 저장소: Map 기반 + TTL (추후 Redis로 교체)
// 규격: (ctx) => ctx, 상태ful 레이어
// ============================================================

// --------------------------------------------------
// 🔷 내부 상태
// --------------------------------------------------
const presenceMap = new Map(); // userId → { status, lastActive, currentRoom }

const PRESENCE_TTL_MS = 5 * 60 * 1000; // 5분 동안 활동 없으면 offline 간주

// --------------------------------------------------
// 🔷 유틸리티
// --------------------------------------------------
function now() {
  return new Date().toISOString();
}

function isOnline(userId) {
  const record = presenceMap.get(userId);
  if (!record) return false;
  const elapsed = Date.now() - new Date(record.lastActive).getTime();
  return elapsed < PRESENCE_TTL_MS;
}

// --------------------------------------------------
// 🔷 접속 상태 업데이트
// --------------------------------------------------
function updatePresence(ctx) {
  const { userId, status = 'online', currentRoom } = ctx.payload || {};

  if (!userId) {
    ctx._error = 'userId is required';
    return ctx;
  }

  const record = {
    userId,
    status,
    currentRoom: currentRoom || null,
    lastActive: now(),
  };

  presenceMap.set(userId, record);
  ctx.presence = { ...record };
  return ctx;
}

function getPresence(ctx) {
  const { userId } = ctx.payload || {};

  if (userId) {
    const record = presenceMap.get(userId);
    ctx.presence = record
      ? { ...record, online: isOnline(userId) }
      : { userId, status: 'offline', online: false };
  } else {
    // 전체 목록
    const all = Array.from(presenceMap.values()).map(record => ({
      ...record,
      online: isOnline(record.userId),
    }));
    ctx.presences = all;
  }

  return ctx;
}

function heartbeat(ctx) {
  const { userId, currentRoom } = ctx.payload || {};

  if (!userId) {
    ctx._error = 'userId is required';
    return ctx;
  }

  const existing = presenceMap.get(userId);
  if (existing) {
    existing.lastActive = now();
    existing.status = 'online';
    if (currentRoom) existing.currentRoom = currentRoom;
  } else {
    presenceMap.set(userId, {
      userId,
      status: 'online',
      currentRoom: currentRoom || null,
      lastActive: now(),
    });
  }

  ctx.heartbeat = true;
  return ctx;
}

// --------------------------------------------------
// 🔷 TTL 정리 (주기적 호출)
// --------------------------------------------------
function cleanStalePresence() {
  const staleThreshold = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
  let cleaned = 0;

  for (const [userId, record] of presenceMap) {
    if (record.lastActive < staleThreshold) {
      record.status = 'offline';
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 [PresenceLayer] ${cleaned}명 offline 처리`);
  }
}

// 1분마다 정리
setInterval(cleanStalePresence, 60 * 1000);

// --------------------------------------------------
// 🔷 액션 라우터
// --------------------------------------------------
const actionMap = {
  UPDATE_PRESENCE: updatePresence,
  GET_PRESENCE: getPresence,
  HEARTBEAT: heartbeat,
};

// --------------------------------------------------
// 🔷 메인 소켓 (ctx) => ctx
// --------------------------------------------------
function ChatPresenceLayer(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { type } = ctx;
  const handler = actionMap[type];

  if (!handler) {
    return ctx;
  }

  try {
    return handler(ctx);
  } catch (err) {
    console.error(`❌ [PresenceLayer] 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 내부 상태 접근자
// --------------------------------------------------
ChatPresenceLayer._getAll = () => presenceMap;
ChatPresenceLayer._clear = () => presenceMap.clear();
ChatPresenceLayer._isOnline = isOnline;

module.exports = ChatPresenceLayer;