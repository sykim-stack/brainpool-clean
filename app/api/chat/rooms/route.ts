// ============================================================
// 🧠 BRAINPOOL OS – API: Chat Rooms
// ============================================================
// 위치: app/api/chat/rooms/route.ts
// 메서드: POST (생성), GET (목록)
// 수정: 2026-05-02 - POST에서 UTF-8 수동 디코딩 적용
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

let CoreChatLayer: any;

async function getCoreChatLayer() {
  if (!CoreChatLayer) {
    try {
      CoreChatLayer = await import('@/brain-engine/layers/CoreChatLayer');
      CoreChatLayer = CoreChatLayer.default || CoreChatLayer;
    } catch (e) {
      console.error('❌ CoreChatLayer 로드 실패:', e);
      return null;
    }
  }
  return CoreChatLayer;
}

// --------------------------------------------------
// POST: 채팅방 생성
// --------------------------------------------------
export async function POST(request: NextRequest) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    // ✅ UTF-8 보장
    const rawBody = await request.text();
    console.log('📥 [API:chat/rooms] 수신 원문:', rawBody.substring(0, 200));

    const body = JSON.parse(rawBody);
    const { title, createdBy, tags, maxParticipants } = body;

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          traceId,
          error: 'Room title is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    console.log(`📝 [API:chat/rooms] 방 제목: "${title}"`);

    const layer = await getCoreChatLayer();
    if (!layer) {
      return NextResponse.json(
        { success: false, traceId, error: 'CoreChatLayer is not available', timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    const ctx = {
      type: 'CREATE_ROOM',
      payload: {
        title,
        createdBy: createdBy || 'anonymous',
        tags: tags || [],
        maxParticipants: maxParticipants || 100,
      },
      traceId,
    };

    const response = await layer(ctx);

    return NextResponse.json(response, {
      status: response.success ? 201 : 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (err: any) {
    console.error('❌ [API:chat/rooms POST] 오류:', err.message);
    return NextResponse.json(
      {
        success: false,
        traceId,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

// --------------------------------------------------
// GET: 방 목록 조회 (한글 수신 없으므로 그대로)
// --------------------------------------------------
export async function GET(request: NextRequest) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const layer = await getCoreChatLayer();
    if (!layer) {
      return NextResponse.json(
        { success: false, traceId, error: 'CoreChatLayer is not available', timestamp: new Date().toISOString() },
        { status: 503 }
      );
    }

    const ctx = {
      type: 'LIST_ROOMS',
      payload: { status },
      traceId,
    };

    const response = await layer(ctx);

    return NextResponse.json(response, {
      status: response.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (err: any) {
    console.error('❌ [API:chat/rooms GET] 오류:', err.message);
    return NextResponse.json(
      {
        success: false,
        traceId,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}