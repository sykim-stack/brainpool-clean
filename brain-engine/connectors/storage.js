// brain-engine/connectors/storage.js
// BRAINPOOL OS Supabase 단일 접근점 (최종 정리 버전)

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
  const deviceId = ctx.device_id || ctx.payload?.device_id || ctx.payload?.user_id;
  
  // device_id 없으면 저장 스킵 (에러 아님)
  if (!deviceId) {
    ctx._skipSave = true;
    return ctx;
  }

  ctx.device_id = deviceId;

  const client = await getStorage();
  if (!client) {
    ctx._skipSave = true;
    return ctx;
  }

  try {
    await client.rpc('set_app_current_device_id', { device_id: deviceId });
  } catch (e) {
    console.warn('[Storage] rpc skipped');
  }

  return ctx;
}

export async function saveTranslation(ctx) {
  ctx = await setCurrentDeviceId(ctx);
  if (ctx._error) return ctx;
  if (ctx._skipSave) return ctx;  // device_id 없으면 저장 안 하고 통과
  return await saveTranslationAsset(ctx);
}

  try {
    const p = ctx.payload || {};

    const { data, error } = await client
      .from('tb_trans_logs')
      .insert({
        user_id: ctx.device_id,
        source_text: p.sourceText || p.source_text || p.text,
        standard_vi: p.translated || p.translatedText || p.standard_vi,
        southern_vi: p.translated || p.translatedText,
        is_southern: true,

        marriage_type: p.marriage_type || null,
        partner_device_id: p.partner_device_id || null,
        context_category: p.context_category || 'daily',
        cultural_notes: p.cultural_notes || null,
        is_cultural_adjusted: p.is_cultural_adjusted ?? false,
      })
      .select()
      .single();

    if (error) {
      ctx._error = `DB Error: ${error.message}`;
    } else {
      ctx.payload.asset_id = data?.id;
    }
  } catch (err) {
    ctx._error = `saveTranslationAsset error: ${err.message}`;
  }

  return ctx;
}

// 메인 추천 함수
export async function saveTranslation(ctx) {
  ctx = await setCurrentDeviceId(ctx);
  if (ctx._error) return ctx;
  return await saveTranslationAsset(ctx);
}