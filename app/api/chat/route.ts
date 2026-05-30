import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const body = JSON.parse(await request.text());
    const { action } = body;

    if (!action) {
      return NextResponse.json({ payload: null, _error: 'action required', traceId }, { status: 400 });
    }

    // ── send ──
    if (action === 'send') {
      const { roomId, userId, original, analyze = true } = body;
      if (!roomId || !userId || !original) {
        return NextResponse.json({ payload: null, _error: 'roomId, userId, original required', traceId }, { status: 400 });
      }
      let translationMeta: any = { translations: {}, detectedLanguage: null, emotion: null, cultureHints: [], translatedText: null, targetLang: null };
      if (analyze) {
        try {
          const { route: engineRoute } = await import('@/brain-engine/hajun/router.js');
          const { createCtx } = await import('@/brain-engine/contracts/ctx.js');
          let ctx = createCtx({ text: original, author: userId }, traceId);
          ctx = await engineRoute('translate', ctx);
          if (!ctx._error) ctx = await engineRoute('emotion', ctx);
          const p = ctx.payload;
          const sourceLang = p.sourceLang || null;
          const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
          const translated = p.translatedText || null;
          translationMeta = {
            translations: translated ? { [targetLang]: translated } : {},
            detectedLanguage: sourceLang,
            emotion: p.emotion ? { primary: p.emotion, intensity: p.emotionScore ?? 0.5 } : null,
            cultureHints: p.culturalNote && p.culturalNote !== 'neutral' ? [p.culturalNote] : [],
            translatedText: translated,
            targetLang,
          };

          // 푸시 알림
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://corering.vercel.app';
            await fetch(appUrl + '/api/push/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ room_id: roomId, sender_id: userId, title: 'CoreRing', body: original.length > 50 ? original.slice(0, 50) + '...' : original, url: '/' }),
            }).catch(() => null);
          } catch (e) {}
        } catch (e: any) {
          console.warn('[chat/send] translate failed:', e.message);
        }
      }
      const { ChatMessageEngine } = await import('@/brain-engine/engines/chat/message.js');
      const result: any = await ChatMessageEngine({ type: 'SEND_MESSAGE', payload: { roomId, userId, original, meta: translationMeta }, traceId, _error: null });
      if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
      return NextResponse.json({ payload: { message: result.message }, _error: null, traceId });
    }

    // ── poll ──
    if (action === 'poll') {
      const { roomId, limit = 50 } = body;
      if (!roomId) return NextResponse.json({ payload: null, _error: 'roomId required', traceId }, { status: 400 });
      const { ChatMessageEngine } = await import('@/brain-engine/engines/chat/message.js');
      const result: any = await ChatMessageEngine({ type: 'GET_HISTORY', payload: { roomId, limit }, traceId, _error: null });
      if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
      return NextResponse.json({ payload: { messages: result.messages ?? [] }, _error: null, traceId });
    }

    // ── join ──
    if (action === 'join') {
      const { inviteCode } = body;
      if (!inviteCode) return NextResponse.json({ payload: null, _error: 'inviteCode required', traceId }, { status: 400 });
      const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
      const result: any = await ChatRoomEngine({ type: 'FIND_BY_CODE', payload: { inviteCode }, traceId, _error: null });
      if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 404 });
      return NextResponse.json({ payload: { room: result.payload.room }, _error: null, traceId });
    }

    // ── create ──
    if (action === 'create') {
      const { title, createdBy, tags, maxParticipants } = body;
      if (!title) return NextResponse.json({ payload: null, _error: 'title required', traceId }, { status: 400 });
      const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
      const result: any = await ChatRoomEngine({ type: 'CREATE_ROOM', payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100 }, traceId, _error: null });
      if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
      return NextResponse.json({ payload: { room: result.room }, _error: null, traceId }, { status: 201 });
    }

    return NextResponse.json({ payload: null, _error: 'unknown action: ' + action, traceId }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const traceId = crypto.randomUUID();
  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get('roomId');
  const limit = parseInt(searchParams.get('limit') || '50');

  if (!roomId) return NextResponse.json({ payload: null, _error: 'roomId required', traceId }, { status: 400 });

  try {
    const { ChatMessageEngine } = await import('@/brain-engine/engines/chat/message.js');
    const result: any = await ChatMessageEngine({ type: 'GET_HISTORY', payload: { roomId, limit }, traceId, _error: null });
    if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
    return NextResponse.json({ payload: { messages: result.messages ?? [] }, _error: null, traceId });
  } catch (err: any) {
    return NextResponse.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}