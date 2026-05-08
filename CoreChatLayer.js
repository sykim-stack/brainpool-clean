const ChatDBCacheLayer = require('./sub/chat-db-cache');

async function handleSendMessage(ctx) {
  const { roomId, userId, original, analyze = true } = ctx.payload || {};

  if (!roomId || !userId || !original) {
    ctx._error = 'roomId, userId, original are required';
    return ctx;
  }

  if (analyze) {
    const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(original);
    const direction = isKorean ? 'ko→vi' : 'vi→ko';

    // 💓 1. DB 캐시 확인
    ctx = await ChatDBCacheLayer({
      ...ctx,
      type: 'FIND_CACHE',
      payload: { sourceText: original, direction },
    });

    if (ctx.cached) {
      // ⚡ DB 히트! 즉시 사용
      console.log(`⚡ [CoreChatLayer] DB 캐시 히트!`);
      ctx.payload.meta = {
        translations: { vi: ctx.cached.translated, ko: isKorean ? original : ctx.cached.translated },
        detectedLanguage: isKorean ? 'ko' : 'vi',
        emotion: { primary: 'neutral', intensity: ctx.cached.emotionScore || 0.5 },
        cultureHints: ctx.cached.conflictCount > 0 ? [`${ctx.cached.conflictCount}개 문화 충돌`] : [],
        extra: { intent: ctx.cached.intent, riskScore: ctx.cached.riskScore, source: 'database' },
      };
    } else {
      // 🧠 2. CoreRing 호출
      const analysis = await analyzeWithCoreRing(original);
      
      if (!analysis._error) {
        // 💾 3. 결과 DB에 저장!
        await ChatDBCacheLayer({
          ...ctx,
          type: 'SAVE_TRANSLATION',
          payload: {
            sourceText: original,
            direction,
            result: {
              translated: analysis.translations?.vi || analysis.translations?.ko || '',
              emotionScore: analysis.emotion?.intensity || 0.5,
              intent: analysis.extra?.intent || null,
              riskScore: analysis.extra?.riskScore || 0,
              traceId: ctx.traceId,
              userId,
            },
          },
        });
        console.log(`💾 [CoreChatLayer] 번역 결과 DB 저장 완료`);
      }
      
      ctx.payload.meta = {
        translations: analysis.translations || {},
        detectedLanguage: analysis.detectedLanguage,
        emotion: analysis.emotion,
        cultureHints: analysis.cultureHints || [],
        extra: analysis.extra || {},
      };
    }
  } else {
    ctx.payload.meta = {};
  }

  // 4. MessageLayer에 저장
  ctx = ChatMessageLayer(ctx);
  if (ctx._error) return ctx;

  // 5. RoomLayer 메시지 카운트 동기화
  if (ctx.roomMessageCount !== undefined) {
    ChatRoomLayer._syncMessageCount(roomId, ctx.roomMessageCount);
  }

  // 6. Presence 업데이트
  ctx = ChatPresenceLayer({
    ...ctx,
    type: 'UPDATE_PRESENCE',
    payload: { userId, status: 'online', currentRoom: roomId },
  });

  console.log(`📤 [CoreChatLayer] 메시지 전송 완료: [${ctx.message?.messageId}]`);
  return ctx;
}