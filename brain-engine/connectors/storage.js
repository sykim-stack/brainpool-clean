// brain-engine/connectors/storage.js
// BRAINPOOL OS - Supabase 단일 접근점 (통합 백신)
// 모든 DB 접근은 반드시 여기서만!
// throw 절대 금지 → ctx._error 사용

let _client = null;

async function getStorage() {
  if (_client) return _client;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.error('[Storage] 환경변수 누락');
      return null;
    }

    _client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    return _client;
  } catch (err) {
    console.error('[Storage] 클라이언트 생성 실패', err);
    return null;
  }
}

// ====================== 주요 함수들 ======================

/**
 * 번역 기록 저장 (가장 중요 함수)
 * 모든 번역은 영구 학습 자산으로 저장
 */
async function saveTranslationAsset(ctx) {
  const client = await getStorage();
  if (!client) {
    ctx._error = "Supabase 클라이언트 연결 실패";
    return ctx;
  }

  try {
    const payload = ctx.payload || {};

    const { data, error } = await client
      .from('tb_trans_logs')
      .insert({
        user_id: ctx.device_id || payload.user_id || payload.device_id,
        source_text: payload.source_text || payload.original_text,
        standard_vi: payload.standard_vi,
        southern_vi: payload.southern_vi,
        is_southern: payload.is_southern ?? false,

        // === 인터메리 특화 컬럼 ===
        marriage_type: payload.marriage_type || 'vn-kr',
        partner_device_id: payload.partner_device_id,
        context_category: payload.context_category || 'daily',
        cultural_notes: payload.cultural_notes || null,
        asset_group_id: payload.asset_group_id,
        is_cultural_adjusted: payload.is_cultural_adjusted ?? false,

        // 기존 컬럼들
        keywords: payload.keywords,
        emotion_score: payload.emotion_score,
        risk_score: payload.risk_score,
        conflict_count: payload.conflict_count,
        emotion: payload.emotion,
        direction: payload.direction,
        session_id: payload.session_id,
        detected_dialect: payload.detected_dialect,
        final_dialect: payload.final_dialect,
        intent: payload.intent,
      })
      .select()
      .single();

    if (error) {
      ctx._error = `저장 실패: ${error.message}`;
      console.error('[Storage] saveTranslationAsset error:', error);
    } else {
      ctx.payload.saved = data;
      ctx.payload.asset_id = data?.id;
    }
  } catch (err) {
    ctx._error = `저장 중 오류: ${err.message}`;
    console.error('[Storage] saveTranslationAsset exception:', err);
  }

  return ctx;
}

/**
 * 특정 device_id의 번역 기록 가져오기
 */
async function getTranslationHistory(ctx) {
  const client = await getStorage();
  if (!client) {
    ctx._error = "Supabase 클라이언트 연결 실패";
    return ctx;
  }

  try {
    const limit = ctx.payload?.limit || 50;
    const device_id = ctx.device_id || ctx.payload?.device_id;

    const { data, error } = await client
      .from('tb_trans_logs')
      .select('*')
      .eq('user_id', device_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      ctx._error = `조회 실패: ${error.message}`;
    } else {
      ctx.payload.history = data || [];
    }
  } catch (err) {
    ctx._error = `조회 중 오류: ${err.message}`;
  }

  return ctx;
}

/**
 * 커플 번역 기록 가져오기 (partner_device_id 포함)
 */
async function getCoupleHistory(ctx) {
  const client = await getStorage();
  if (!client) return ctx;

  try {
    const device_id = ctx.device_id;
    const partner_id = ctx.payload?.partner_device_id;

    const { data, error } = await client
      .from('tb_trans_logs')
      .select('*')
      .or(`user_id.eq.${device_id},partner_device_id.eq.${device_id}`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) ctx._error = error.message;
    else ctx.payload.couple_history = data || [];
  } catch (err) {
    ctx._error = err.message;
  }

  return ctx;
}
async function setCurrentDeviceId(ctx) {
  const client = await getStorage();
  if (!client) return ctx;

  const deviceId = ctx.device_id || ctx.payload?.device_id || ctx.payload?.user_id;
  
  if (deviceId) {
    try {
      // Supabase 세션에 device_id 설정
      await client.rpc('set_app_current_device_id', { device_id: deviceId });
      ctx.device_id = deviceId; // ctx에 확실히 저장
    } catch (err) {
      console.warn('[Storage] device_id 설정 실패 (rpc 없을 수 있음)', err);
      // rpc가 없으면 fallback
    }
  }
  return ctx;
}

/**
 * Helper: 번역 저장 전체 흐름 (ctx 하나로 처리)
 */
async function saveTranslation(ctx) {
  ctx = await setCurrentDeviceId(ctx);
  ctx = await saveTranslationAsset(ctx);
  return ctx;
}

/**
 * RLS에서 사용할 device_id 설정 (매우 중요!)
 * DB 작업 전에 반드시 호출해야 policies가 제대로 작동함
 */
async function setCurrentDeviceId(ctx) {
  const client = await getStorage();
  if (!client) {
    ctx._error = "Storage client not available";
    return ctx;
  }

  const deviceId = ctx.device_id || ctx.payload?.device_id || ctx.payload?.user_id;

  if (!deviceId) {
    ctx._error = "device_id가 없습니다";
    return ctx;
  }

  try {
    // Supabase에 현재 device_id 알려주기
    await client.rpc('set_app_current_device_id', { 
      device_id: deviceId 
    }).catch(() => {
      // rpc 함수가 없으면 무시 (나중에 만들면 됨)
      console.log('[Storage] rpc set_app_current_device_id skipped');
    });

    ctx.device_id = deviceId;   // ctx에 확실히 저장
    return ctx;
  } catch (err) {
    console.warn('[Storage] setCurrentDeviceId warning:', err.message);
    ctx.device_id = deviceId;   // 에러가 나도 device_id는 저장
    return ctx;
  }
}

/**
 * 번역 저장 전체 흐름 (추천 사용 함수)
 */
async function saveTranslation(ctx) {
  ctx = await setCurrentDeviceId(ctx);
  if (ctx._error) return ctx;

  ctx = await saveTranslationAsset(ctx);
  return ctx;
}
// ====================== 모듈 export ======================
module.exports = {
  getStorage,
  saveTranslationAsset,
  getTranslationHistory,
  getCoupleHistory,
  setCurrentDeviceId,     // ← 추가
  saveTranslation         // ← 주로 사용할 함수
};