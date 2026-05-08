// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer (메인 조합기)
// 수정: 2026-05-07
//   - analyzeWithCoreRing 내 중복 DB 저장 제거
//   - /api/brainpool이 이미 저장하므로 CoreChatLayer는 저장하지 않음
// ============================================================

const ChatRoomLayer = require('./sub/chat-room-layer');
const ChatMessageLayer = require('./sub/chat-message-layer');
const ChatPresenceLayer = require('./sub/chat-presence-layer');

// --------------------------------------------------
// 🔷 CoreRing 연동
// --------------------------------------------------
async function analyzeWithCoreRing(text) {
  try {
    const requestBody = JSON.stringify({ text });
    const response = await fetch('http://localhost:3000/api/brainpool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: requestBody,
    });
    if (!response.ok) {
      console.error(`❌ CoreRing 응답 오류 (${response.status})`);
      return { _error: `CoreRing responded with ${response.status}` };
    }
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const rawText = decoder.decode(buffer);
    const data = JSON.parse(rawText);
    const msg = data.message || data;
    const payload = msg.payload || {};
    const meta = msg.meta || {};

    const translated = payload.translated;
    const sourceLang = meta.sourceLang;
    const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
    const translations = {};
    if (translated) {
      translations[targetLang] = translated;
    }

    // ✅ /api/brainpool이 이미 DB 저장을 완료했으므로 여기서는 저장하지 않음

    const emotion = meta.emotionScore !== undefined
      ? { primary: meta.emotionScore > 0.5 ? 'joy' : 'neutral', intensity: meta.emotionScore, confidence: 0.8 }
      : null;
    const cultureHints = [];
    if (meta.culturalNote) cultureHints.push(meta.culturalNote);
    if (meta.conflicts?.length) cultureHints.push(`${meta.conflicts.length}개 방언 충돌 감지`);

    console.log(`✅ [CoreChatLayer] 분석 완료: ${sourceLang} → ${targetLang}, 번역="${translated}"`);
    return { translations, detectedLanguage: sourceLang, emotion, cultureHints, translatedText: translated, targetLang };
  } catch (err) {
    console.error(`❌ [CoreChatLayer] CoreRing 연동 실패:`, err.message);
    return { _error: err.message };
  }
}

// --------------------------------------------------
// 🔷 메시지 전송 파이프라인
// --------------------------------------------------
async function handleSendMessage(ctx) {
  const { roomId, userId, original, analyze = true } = ctx.payload || {};
  if (!roomId || !userId || !original) {
    ctx._error = 'roomId, userId, original are required';
    return ctx;
  }

  let analysis = {};
  if (analyze) {
    analysis = await analyzeWithCoreRing(original);
    if (analysis._error) {
      console.warn(`⚠️ CoreRing 분석 실패, 계속 진행: ${analysis._error}`);
    }
  }

  ctx.payload.meta = {
    translations: analysis.translations || {},
    detectedLanguage: analysis.detectedLanguage || null,
    emotion: analysis.emotion || null,
    cultureHints: analysis.cultureHints || [],
    translatedText: analysis.translatedText || null,
    targetLang: analysis.targetLang || null,
  };

  ctx = await ChatMessageLayer(ctx);
  if (ctx._error) {
    console.error(`❌ MessageLayer 저장 실패: ${ctx._error}`);
  }

  if (!ctx.message) {
    const meta = ctx.payload.meta;
    const translated = meta.translatedText || (meta.translations ? Object.values(meta.translations)[0] : '');
    const targetLang = meta.targetLang || (meta.translations ? Object.keys(meta.translations)[0] : 'unknown');
    ctx.message = {
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      roomId,
      senderId: userId,
      originalText: original,
      translatedText: translated,
      sourceLang: meta.detectedLanguage || 'unknown',
      targetLang: targetLang,
      createdAt: new Date().toISOString(),
    };
    console.log(`📝 [CoreChatLayer] Fallback 메시지 생성: ${ctx.message.messageId}`);
  }

  ctx = await ChatPresenceLayer({ ...ctx, type: 'UPDATE_PRESENCE', payload: { userId, status: 'online', currentRoom: roomId } });
  console.log(`📤 [CoreChatLayer] 메시지 처리 완료: msgId=${ctx.message?.messageId}`);
  return ctx;
}

// --------------------------------------------------
// 🔷 액션 라우터
// --------------------------------------------------
async function routeAction(ctx) {
  const { type } = ctx;
  if (['CREATE_ROOM', 'GET_ROOM', 'LIST_ROOMS', 'DELETE_ROOM', 'JOIN_ROOM', 'LEAVE_ROOM', 'GET_PARTICIPANTS'].includes(type)) {
    ctx = await ChatRoomLayer(ctx);
    return ctx;
  }
  if (['GET_HISTORY', 'GET_TRACE', 'MARK_READ'].includes(type)) {
    ctx = await ChatMessageLayer(ctx);
    return ctx;
  }
  if (['UPDATE_PRESENCE', 'GET_PRESENCE', 'HEARTBEAT'].includes(type)) {
    ctx = await ChatPresenceLayer(ctx);
    return ctx;
  }
  if (type === 'SEND_MESSAGE') {
    ctx = await handleSendMessage(ctx);
    return ctx;
  }
  ctx._error = `Unknown action type: ${type}`;
  return ctx;
}

// --------------------------------------------------
// 🔷 에러 응답 래퍼
// --------------------------------------------------
function wrapResponse(ctx) {
  return {
    success: !ctx._error,
    traceId: ctx.traceId || `trace_${Date.now()}`,
    data: {
      message: ctx.message || null, room: ctx.room || null, rooms: ctx.rooms || null,
      messages: ctx.messages || null, traceMessage: ctx.traceMessage || null,
      presence: ctx.presence || null, presences: ctx.presences || null,
      participants: ctx.participants || null, joined: ctx.joined || null,
      left: ctx.left || null, deleted: ctx.deleted || null, event: ctx.event || null,
      heartbeat: ctx.heartbeat || null, markedRead: ctx.markedRead || null,
      messageCount: ctx.messageCount || null, roomMessageCount: ctx.roomMessageCount || null,
    },
    error: ctx._error || null,
    timestamp: new Date().toISOString(),
  };
}

// --------------------------------------------------
// 🔷 메인 진입점
// --------------------------------------------------
async function CoreChatLayer(ctx) {
  if (!ctx || !ctx.type) {
    return wrapResponse({ _error: 'Invalid context: type is required', traceId: `trace_${Date.now()}` });
  }
  if (!ctx.traceId) {
    ctx.traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
  console.log(`🦈 [CoreChatLayer] 액션 수신: ${ctx.type} [${ctx.traceId}]`);
  ctx = await routeAction(ctx);
  const response = wrapResponse(ctx);
  console.log(`✅ [CoreChatLayer] 응답: success=${response.success}, traceId=${response.traceId}`);
  return response;
}

CoreChatLayer._roomLayer = ChatRoomLayer;
CoreChatLayer._messageLayer = ChatMessageLayer;
CoreChatLayer._presenceLayer = ChatPresenceLayer;

module.exports = CoreChatLayer;