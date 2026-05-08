// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer / Sub: Message Layer (Supabase)
// ============================================================
// 위치: brain-engine/layers/sub/chat-message-layer.js
// 수정: 2026-05-02
//   - sender_id가 UUID가 아니면 null 처리
//   - device_id에 문자열 ID 저장
// ============================================================

let supabaseAdmin = null;
async function getSupabase() {
  if (!supabaseAdmin) {
    const { createClient } = await import('@supabase/supabase-js');
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log('🗄️ [MessageLayer] Supabase 연결 완료');
  }
  return supabaseAdmin;
}

// --------------------------------------------------
// 🔷 유틸리티
// --------------------------------------------------
function now() {
  return new Date().toISOString();
}

/** UUID 형식인지 확인 */
function isUUID(str) {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// --------------------------------------------------
// 🔷 메시지 저장
// --------------------------------------------------
async function saveMessage(ctx) {
  const { roomId, userId, original, meta = {} } = ctx.payload || {};

  if (!roomId || !userId || !original) {
    ctx._error = 'roomId, userId, and original are required';
    return ctx;
  }

  try {
    const supabase = await getSupabase();
    
    const traceId = ctx.traceId || `trace_${Date.now()}`;
    
    // ✅ sender_id는 UUID일 때만 넣고, 아니면 null
    const senderId = isUUID(userId) ? userId : null;
    const deviceId = userId; // device_id는 varchar라 그대로 OK
    
    console.log(`💾 [MessageLayer] 저장 시도: roomId=${roomId}, senderId=${senderId}, deviceId=${deviceId}`);
    
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: roomId,          // UUID
        sender_id: senderId,      // UUID 또는 null
        sender_role: 'user',
        message: original,
        translated_ko: meta.translations?.ko || null,
        translated_vi: meta.translations?.vi || null,
        nickname: deviceId,
        device_id: deviceId,      // varchar OK
      })
      .select()
      .single();

    if (error) throw error;

    const message = {
      messageId: data.id,
      roomId: data.room_id,
      traceId,
      userId: data.device_id || userId,
      type: 'chat',
      original: data.message,
      translations: {
        ko: data.translated_ko,
        vi: data.translated_vi,
      },
      detectedLanguage: meta.detectedLanguage || null,
      emotion: meta.emotion || null,
      cultureHints: meta.cultureHints || [],
      isRead: false,
      timestamp: data.created_at,
      _error: null,
    };

    console.log(`💬 [MessageLayer] 메시지 저장 완료: [${message.messageId}]`);
    ctx.message = message;
    return ctx;
  } catch (err) {
    console.error(`❌ [MessageLayer] 저장 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 히스토리 조회
// --------------------------------------------------
async function getHistory(ctx) {
  const { roomId, limit = 50, before } = ctx.payload || {};

  if (!roomId) {
    ctx._error = 'roomId is required';
    return ctx;
  }

  try {
    const supabase = await getSupabase();
    
    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) throw error;

    ctx.messages = (data || []).map(m => ({
      messageId: m.id,
      roomId: m.room_id,
      traceId: m.id,
      userId: m.device_id || m.sender_id || 'unknown',
      type: 'chat',
      original: m.message,
      translations: {
        ko: m.translated_ko,
        vi: m.translated_vi,
      },
      detectedLanguage: null,
      emotion: null,
      cultureHints: [],
      isRead: false,
      timestamp: m.created_at,
      _error: null,
    }));
    ctx.messageCount = ctx.messages.length;
    return ctx;
  } catch (err) {
    console.error(`❌ [MessageLayer] 히스토리 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 traceId 추적
// --------------------------------------------------
async function getByTrace(ctx) {
  const { traceId } = ctx.payload || {};

  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('id', traceId)
      .single();

    if (error || !data) {
      ctx._error = `Trace not found: ${traceId}`;
      return ctx;
    }

    ctx.traceMessage = {
      messageId: data.id,
      roomId: data.room_id,
      traceId: data.id,
      userId: data.device_id || data.sender_id || 'unknown',
      type: 'chat',
      original: data.message,
      translations: {
        ko: data.translated_ko,
        vi: data.translated_vi,
      },
      timestamp: data.created_at,
    };
    return ctx;
  } catch (err) {
    console.error(`❌ [MessageLayer] 추적 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 액션 라우터
// --------------------------------------------------
const actionMap = {
  SEND_MESSAGE: saveMessage,
  GET_HISTORY: getHistory,
  GET_TRACE: getByTrace,
};

// --------------------------------------------------
// 🔷 메인 소켓
// --------------------------------------------------
async function ChatMessageLayer(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { type } = ctx;
  const handler = actionMap[type];

  if (!handler) return ctx;

  try {
    return await handler(ctx);
  } catch (err) {
    console.error(`❌ [MessageLayer] 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

module.exports = ChatMessageLayer;