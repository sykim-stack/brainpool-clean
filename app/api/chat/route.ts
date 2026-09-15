import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const traceId = crypto.randomUUID();
  try {
    const body = JSON.parse(await request.text());
    const { action } = body;

    console.log(`[chat] action=${action} traceId=${traceId}`);

    if (!action) {
      return NextResponse.json({ payload: null, _error: 'action required', traceId }, { status: 400 });
    }

    // ── send ──
    // [PATCH-A] Primary=messages 성공이 요청 성공. Derived 실패는 partial+warnings (500 아님)
    if (action === 'send') {
      const { roomId, userId, original, analyze = true } = body;
      if (!roomId || !userId || !original) {
        return NextResponse.json({ payload: null, _error: 'roomId, userId, original required', traceId }, { status: 400 });
      }

      const warnings: { code: string; message: string }[] = [];

      // ── Step 1: 번역만 먼저 (동기) ──────────────────────────
      let translationMeta: any = {
        translations: {}, detectedLanguage: null, emotion: null, cultureHints: [],
        translatedText: null, targetLang: null,
        riskScore: 0, intent: null, meaningScore: null,
        detectedDialect: 'unknown', isSouthern: false, culturalNote: null,
      };

      if (analyze) {
        try {
          const { route: engineRoute } = await import('@/brain-engine/hajun/router.js');
          const { createCtx } = await import('@/brain-engine/contracts/ctx.js');
          let ctx = createCtx({ text: original, author: userId }, traceId);
          ctx = await engineRoute('translate', ctx);

          if (ctx._error) {
            const msg = typeof ctx._error === 'string' ? ctx._error : (ctx._error as any)?.message || 'translate failed';
            warnings.push({ code: 'TRANSLATE', message: msg });
            console.warn(`[chat/send] translate _error traceId=${traceId}`, msg);
          }

          const p = ctx.payload || {};
          const sourceLang = p.sourceLang || null;
          const targetLang = sourceLang === 'ko' ? 'vi' : 'ko';
          const translated = p.translatedText || null;

          translationMeta = {
            translations: translated ? { [targetLang]: translated } : {},
            detectedLanguage: sourceLang,
            emotion: null,
            cultureHints: [],
            translatedText: translated,
            targetLang,
            riskScore: 0,
            intent: null,
            meaningScore: null,
            detectedDialect: 'unknown',
            isSouthern: false,
            culturalNote: null,
            tbTransLogId: null,
          };

          // ── Step 1.5: tb_trans_logs 선제 저장 (Derived) ────
          try {
            const { getStorage } = await import('@/brain-engine/connectors/storage.js');
            const db = await getStorage();
            if (db && translated) {
              const direction = sourceLang === 'ko' ? 'KO_VI' : 'VI_KO';
              const { data: logData, error: logErr } = await db
                .from('tb_trans_logs')
                .insert({
                  source_text: original,
                  standard_vi: translated,
                  direction,
                  trace_id: traceId,
                })
                .select('id')
                .single();
              if (logErr) {
                warnings.push({ code: 'TB_TRANS_LOGS_PRESAVE', message: logErr.message });
                console.warn(`[chat/send] tb_trans_logs 선제 저장 실패 traceId=${traceId}:`, logErr.message);
              } else if (logData?.id) {
                translationMeta.tbTransLogId = logData.id;
              }
            } else if (!translated) {
              warnings.push({ code: 'TRANSLATE_EMPTY', message: 'translatedText empty' });
            }
          } catch (e: any) {
            warnings.push({ code: 'TB_TRANS_LOGS_PRESAVE', message: e.message || 'presave failed' });
            console.warn(`[chat/send] tb_trans_logs 선제 저장 실패 traceId=${traceId}:`, e.message);
          }

          // ── Step 2: 분석+푸시 (백그라운드, Derived) — 응답 후 실패는 traceId 로그로만 관측 ────
          Promise.resolve().then(async () => {
            try {
              let analysisCtx = { ...ctx };
              analysisCtx = await engineRoute('emotion', analysisCtx);
              if (analysisCtx._error) {
                console.warn(`[chat/send] emotion derived fail traceId=${traceId}`, analysisCtx._error);
              }
              if (!analysisCtx._error) analysisCtx = await engineRoute('dialect', analysisCtx);
              if (analysisCtx._error) {
                console.warn(`[chat/send] dialect derived fail traceId=${traceId}`, analysisCtx._error);
              }

              const ap = analysisCtx.payload;
              console.log(`[chat/send] 분석 완료 traceId=${traceId} emotion=${ap?.emotion} risk=${ap?.riskScore}`);

              const { getStorage } = await import('@/brain-engine/connectors/storage.js');
              const db = await getStorage();
              if (db) {
                const sourceLangBg = ctx.payload?.sourceLang || null;
                const direction = sourceLangBg === 'ko' ? 'KO_VI' : 'VI_KO';
                const updatePayload = {
                  emotion:          ap?.emotion || 'neutral',
                  emotion_score:    ap?.emotionScore ?? 0.5,
                  risk_score:       ap?.riskScore ?? 0,
                  conflict_count:   ap?.conflictCount ?? 0,
                  intent:           ap?.intent || null,
                  meaning_score:    ap?.meaningScore ?? null,
                  meaning_reason:   ap?.meaningReason ?? null,
                  risk_reason:      ap?.riskReason ?? null,
                  detected_dialect: ap?.detectedDialect || 'unknown',
                  is_southern:      ap?.isSouthern ?? false,
                  cultural_notes:   ap?.culturalNote ? { warning: ap.culturalNote } : null,
                };
                const logId = translationMeta.tbTransLogId;
                if (logId) {
                  const { error: upErr } = await db.from('tb_trans_logs').update(updatePayload).eq('id', logId);
                  if (upErr) console.warn(`[chat/send] tb_trans_logs UPDATE fail traceId=${traceId}:`, upErr.message);
                } else {
                  const { data: existing } = await db
                    .from('tb_trans_logs').select('id')
                    .eq('source_text', original).eq('direction', direction)
                    .order('created_at', { ascending: false }).limit(1);
                  const existingId = existing?.[0]?.id;
                  if (existingId) {
                    const { error: upErr } = await db.from('tb_trans_logs').update(updatePayload).eq('id', existingId);
                    if (upErr) console.warn(`[chat/send] tb_trans_logs UPDATE fail traceId=${traceId}:`, upErr.message);
                  } else {
                    const { error: inErr } = await db.from('tb_trans_logs').insert({
                      source_text: original,
                      standard_vi: ctx.payload?.translatedText || original,
                      direction,
                      ...updatePayload,
                    });
                    if (inErr) console.warn(`[chat/send] tb_trans_logs INSERT fail traceId=${traceId}:`, inErr.message);
                  }
                }
              }
            } catch (e: any) {
              console.warn(`[chat/send] 백그라운드 분석 실패 traceId=${traceId}:`, e.message);
            }

            try {
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://corering.vercel.app';
              const pushRes = await fetch(appUrl + '/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: roomId, sender_id: userId, title: 'CoreRing', body: original.length > 50 ? original.slice(0, 50) + '...' : original, url: `/?room=${roomId}` }),
              });
              if (!pushRes.ok) {
                console.warn(`[chat/send] push fail traceId=${traceId} status=${pushRes.status}`);
              }
            } catch (e: any) {
              console.warn(`[chat/send] push fail traceId=${traceId}:`, e?.message || e);
            }
          });

        } catch (e: any) {
          warnings.push({ code: 'TRANSLATE', message: e.message || 'translate failed' });
          console.warn(`[chat/send] translate failed traceId=${traceId}:`, e.message);
        }
      }

      // ── Step 3: Primary Message 저장 + 응답 ─────────────────────────
      const flatMeta = {
        ...translationMeta,
        emotion: translationMeta.emotion?.primary || null,
      };
      const { ChatMessageEngine } = await import('@/brain-engine/engines/chat/message.js');
      const result: any = await ChatMessageEngine({ type: 'SEND_MESSAGE', payload: { roomId, userId, original, meta: flatMeta }, traceId, _error: null });
      if (result._error) return NextResponse.json({ payload: null, _error: result._error, traceId }, { status: 500 });
      const partial = warnings.length > 0;
      return NextResponse.json({
        payload: { message: result.message, partial, warnings },
        _error: null,
        traceId,
      });
    }

    // ── poll ──
    if (action === 'poll') {
      const { roomId, limit = 50 } = body;
      if (!roomId) return NextResponse.json({ payload: null, _error: 'roomId required', traceId }, { status: 400 });
      console.log(`[chat/poll] roomId=${roomId}`);
      const { ChatMessageEngine } = await import('@/brain-engine/engines/chat/message.js');
      const result: any = await ChatMessageEngine({ type: 'GET_HISTORY', payload: { roomId, limit }, traceId, _error: null });
      console.log(`[chat/poll] done error=${result._error}`);
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
      const { title, createdBy, tags, maxParticipants, isPublic = true } = body;
      if (!title) return NextResponse.json({ payload: null, _error: 'title required', traceId }, { status: 400 });
      const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
      const result: any = await ChatRoomEngine({ type: 'CREATE_ROOM', payload: { title, createdBy: createdBy || 'anonymous', tags: tags || [], maxParticipants: maxParticipants || 100, isPublic }, traceId, _error: null });
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
