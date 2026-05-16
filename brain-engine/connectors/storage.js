// brain-engine/connectors/storage.js
// BRAINPOOL OS - Supabase 단일 접근점 (ES Module 버전)

let _client = null;

export async function getStorage() {
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

export async function setCurrentDeviceId(ctx) {
  ctx = ctx || {};
  const client = await getStorage();
  if (!client) {
    ctx._error = "Storage client not available";
    return ctx;
  }

  const deviceId = ctx.device_id || ctx.payload?.device_id || ctx.payload?.user_id;
  if (!deviceId) {
    ctx._error = "device_id is required";
    return ctx;
  }

  ctx.device_id = deviceId;
  return ctx;
}

export async function saveTranslationAsset(ctx) {
  ctx = ctx || {};
  const client = await getStorage();
  if (!client) {
    ctx._error = "Supabase client not available";
    return ctx;
  }

  try {
    const payload = ctx.payload || {};

    const { data, error } = await client
      .from('tb_trans_logs')
      .insert({
        user_id: ctx.device_id || payload.user_id,
        source_text: payload.source_text || payload.text || payload.original_text,
        standard_vi: payload.standard_vi || payload.translatedText,
        southern_vi: payload.southern_vi || payload.translatedText,
        is_southern: payload.is_southern ?? true,

        marriage_type: payload.marriage_type || null,
        partner_device_id: payload.partner_device_id || null,
        context_category: payload.context_category || 'daily',
        cultural_notes: payload.cultural_notes || null,
        asset_group_id: payload.asset_group_id || null,
        is_cultural_adjusted: payload.is_cultural_adjusted ?? false,

        emotion_score: payload.emotion_score,
        emotion: payload.emotion,
        risk_score: payload.risk_score,
      })
      .select()
      .single();

    if (error) {
      ctx._error = `DB insert error: ${error.message}`;
      console.error(error);
    } else {
      ctx.payload.asset_id = data?.id;
      console.log(`[Storage] Saved asset ID: ${data?.id}`);
    }
  } catch (err) {
    ctx._error = `saveTranslationAsset error: ${err.message}`;
    console.error(err);
  }

  return ctx;
}

// 추천 사용 함수
export async function setCurrentDeviceId(ctx) {
  ctx = ctx || {};
  const client = await getStorage();
  if (!client) {
    ctx._error = "Storage client not available";
    return ctx;
  }

  const deviceId = ctx.device_id || ctx.payload?.device_id || ctx.payload?.user_id;
  if (!deviceId) {
    ctx._error = "device_id is required for RLS";
    return ctx;
  }

  ctx.device_id = deviceId;

  // rpc 호출은 실패해도 무시 (아직 rpc 함수가 없을 가능성 높음)
  try {
    await client.rpc('set_app_current_device_id', { device_id: deviceId });
  } catch (e) {
    // rpc가 없으면 무시
    console.warn('[setCurrentDeviceId] rpc skipped (아직 생성 안함)');
  }

  return ctx;
}