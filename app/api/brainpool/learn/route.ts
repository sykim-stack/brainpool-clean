// app/api/brainpool/learn/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 환경 변수 값을 미리 검사합니다.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 클라이언트를 바로 생성하지 않고 필요할 때만 생성하는 함수입니다.
let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _supabase;
}

const normalize = (s: string): string => {
  return s
    .trim()
    .toLowerCase()
    .replace(/[!?.,~]+/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1');
};

export async function POST(request: Request) {
  let ctx: any = {};

  ctx = await initCtx(request)(ctx);
  ctx = await parseBody(request)(ctx);
  ctx = await validate(ctx);
  ctx = await upsertPersonal(ctx);
  ctx = await finalize(ctx);

  if (ctx._error) {
    return NextResponse.json({ error: ctx._error, traceId: ctx.traceId }, { status: 400 });
  }

  return NextResponse.json(ctx.response, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const initCtx = (request: Request) => (ctx: any) => {
  ctx.traceId = request.headers.get('x-trace-id') || crypto.randomUUID();
  ctx._error = null;
  ctx.payload = null;
  ctx.response = null;
  return ctx;
};

const parseBody = (request: Request) => async (ctx: any) => {
  try {
    const text = await request.text();
    ctx.payload = text ? JSON.parse(text) : {};
  } catch (e) {
    ctx._error = 'INVALID_JSON';
  }
  return ctx;
};

const validate = (ctx: any) => {
  if (ctx._error) return ctx;

  const p = ctx.payload;
  if (!p.device_id) {
    ctx._error = 'DEVICE_ID_REQUIRED';
    return ctx;
  }
  if (!p.original) {
    ctx._error = 'ORIGINAL_REQUIRED';
    return ctx;
  }
  if (!p.translated) {
    ctx._error = 'TRANSLATED_REQUIRED';
    return ctx;
  }
  return ctx;
};

const upsertPersonal = async (ctx: any) => {
  if (ctx._error) return ctx;

  // 환경 변수 검증 강화
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    ctx._error = 'SUPABASE_CONFIG_MISSING';
    return ctx;
  }

  const supabase = getSupabase();
  const p = ctx.payload;
  const normalizedText = normalize(p.original);

  // 1. 기존 데이터 확인
  const { data: existing } = await supabase
    .from('tb_trans_logs')
    .select('id, usage_count')
    .eq('device_id', p.device_id)
    .eq('normalized_text', normalizedText)
    .maybeSingle();

  if (existing) {
    // 2. 사용자 수정본은 usage_count를 최상위로
    await supabase
      .from('tb_trans_logs')
      .update({
        text_translated: p.translated,
        usage_count: 9999,
      })
      .eq('id', existing.id);
  } else {
    // 3. 신규 저장
    await supabase.from('tb_trans_logs').insert({
      device_id: p.device_id,
      text_original: p.original,
      text_translated: p.translated,
      normalized_text: normalizedText,
      usage_count: 9999,
    });
  }

  return ctx;
};

const finalize = (ctx: any) => {
  if (ctx._error) return ctx;

  ctx.response = {
    traceId: ctx.traceId,
    data: {
      status: 'ok',
      original: ctx.payload.original,
      translated: ctx.payload.translated,
    },
  };
  return ctx;
};