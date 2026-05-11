// ============================================================
// 🧠 BRAINPOOL OS – CoreChatLayer / Sub: Room Layer (Supabase)
// ============================================================
// 위치: brain-engine/layers/sub/chat-room-layer.js
// 수정: 2026-05-02
//   - invite_code를 6자리로 단축
//   - roomId를 UUID로 반환 (chat_rooms.id)
// ============================================================

const { getStorage } = require('../../connectors/storage');
async function getSupabase() {
  return await getStorage();
}

// --------------------------------------------------
// 🔷 유틸리티
// --------------------------------------------------
function now() {
  return new Date().toISOString();
}

/** 6자리 초대 코드 생성 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0,O,1,I 제외
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --------------------------------------------------
// 🔷 방 CRUD (Supabase)
// --------------------------------------------------
async function createRoom(ctx) {
  const { title, createdBy = 'anonymous', tags = [], maxParticipants = 100 } = ctx.payload || {};

  if (!title) {
    ctx._error = 'Room title is required';
    return ctx;
  }

  try {
    const supabase = await getSupabase();
    
    const inviteCode = generateInviteCode(); // ✅ 6자리 코드
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        room_name: title,
        invite_code: inviteCode,
        room_type: 'chat',
        created_by: null, // UUID가 없으므로 null
        owner_device_id: createdBy,
        is_permanent: false,
        metadata: {
          tags,
          maxParticipants,
          createdBy,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // ✅ UUID를 roomId로 사용
    const room = {
      roomId: data.id,               // UUID (예: 550e8400-e29b-41d4-a716-446655440000)
      inviteCode: data.invite_code,   // 6자리 코드
      title: data.room_name,
      status: 'active',
      createdBy,
      createdAt: data.created_at,
      updatedAt: data.created_at,
      messageCount: 0,
      participantCount: 1,
      maxParticipants,
      tags,
    };

    console.log(`✅ [RoomLayer] 방 생성: [${room.roomId}] "${title}" (코드: ${inviteCode})`);
    ctx.room = room;
    return ctx;
  } catch (err) {
    console.error(`❌ [RoomLayer] 생성 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

async function getRoom(ctx) {
  const { roomId } = ctx.payload || {};

  try {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      ctx._error = `Room not found: ${roomId}`;
      return ctx;
    }

    ctx.room = {
      roomId: data.id,
      inviteCode: data.invite_code,
      title: data.room_name,
      status: 'active',
      createdBy: data.metadata?.createdBy || 'anonymous',
      createdAt: data.created_at,
      updatedAt: data.created_at,
      messageCount: data.metadata?.messageCount || 0,
      participantCount: 0, // 별도 쿼리로 계산 가능
      maxParticipants: data.metadata?.maxParticipants || 100,
      tags: data.metadata?.tags || [],
    };
    return ctx;
  } catch (err) {
    console.error(`❌ [RoomLayer] 조회 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

async function listRooms(ctx) {
  const { status } = ctx.payload || {};

  try {
    const supabase = await getSupabase();
    
    let query = supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    ctx.rooms = (data || []).map(r => ({
      roomId: r.id,
      inviteCode: r.invite_code,
      title: r.room_name,
      status: 'active',
      createdBy: r.metadata?.createdBy || 'anonymous',
      createdAt: r.created_at,
      updatedAt: r.created_at,
      messageCount: r.metadata?.messageCount || 0,
      participantCount: 0,
      maxParticipants: r.metadata?.maxParticipants || 100,
      tags: r.metadata?.tags || [],
    }));
    return ctx;
  } catch (err) {
    console.error(`❌ [RoomLayer] 목록 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

async function deleteRoom(ctx) {
  const { roomId } = ctx.payload || {};

  try {
    const supabase = await getSupabase();
    
    const { error } = await supabase
      .from('chat_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;

    console.log(`🗑️ [RoomLayer] 방 삭제: [${roomId}]`);
    ctx.deleted = true;
    return ctx;
  } catch (err) {
    console.error(`❌ [RoomLayer] 삭제 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}
// --------------------------------------------------
// 🔷 참여자 관리
// --------------------------------------------------
async function joinRoom(ctx) {
  const { roomId, userId, nickname } = ctx.payload || {};

  try {
    const supabase = await getSupabase();
    
    const { error } = await supabase
      .from('chat_participants')
      .insert({
        room_id: roomId,  // UUID
        user_id: null,    // auth user 없으면 null
        nickname: nickname || 'anonymous',
        role: 'member',
        device_id: userId || 'anonymous',
      });

    if (error) throw error;

    ctx.joined = true;
    ctx.event = { type: 'JOIN', roomId, userId };
    return ctx;
  } catch (err) {
    console.error(`❌ [RoomLayer] 참가 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 메시지 카운트 동기화
// --------------------------------------------------
async function syncMessageCount(roomId, count) {
  try {
    const supabase = await getSupabase();
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('metadata')
      .eq('id', roomId)
      .single();
    
    const newMetadata = { ...(room?.metadata || {}), messageCount: count };
    
    await supabase
      .from('chat_rooms')
      .update({ metadata: newMetadata })
      .eq('id', roomId);
  } catch (err) {
    console.error(`❌ [RoomLayer] 카운트 동기화 오류:`, err.message);
  }
}

// --------------------------------------------------
// 🔷 액션 라우터
// --------------------------------------------------
const actionMap = {
  CREATE_ROOM: createRoom,
  GET_ROOM: getRoom,
  LIST_ROOMS: listRooms,
  DELETE_ROOM: deleteRoom,
  JOIN_ROOM: joinRoom,
};

// --------------------------------------------------
// 🔷 메인 소켓 (ctx) => ctx
// --------------------------------------------------
async function ChatRoomLayer(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { type } = ctx;
  const handler = actionMap[type];

  if (!handler) return ctx;

  try {
    return await handler(ctx);
  } catch (err) {
    console.error(`❌ [RoomLayer] 오류:`, err.message);
    ctx._error = err.message;
    return ctx;
  }
}

// --------------------------------------------------
// 🔷 내부 접근자
// --------------------------------------------------
ChatRoomLayer._syncMessageCount = syncMessageCount;

module.exports = ChatRoomLayer;

