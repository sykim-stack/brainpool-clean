// brain-engine/engines/corehub/house.js
// [CONNECT] OS apps/corenull/house.js 읽기 경로만 포팅 (join/쓰기 없음)

import { getStorage } from '../../connectors/storage.js';

/** owner_key 기준 하우스 목록 (읽기) */
export async function listHouses(ctx) {
  const { owner_key } = ctx.payload || {};
  if (!owner_key) {
    return { ...ctx, _error: { code: 'MISSING_OWNER_KEY', message: 'owner_key 필요', retryable: false } };
  }
  const supabase = await getStorage();
  if (!supabase) {
    return { ...ctx, _error: { code: 'DB_FAIL', message: 'DB connection failed', retryable: true } };
  }
  const { data, error } = await supabase
    .from('corenull_houses')
    .select('*')
    .eq('owner_key', owner_key);

  if (error) {
    return { ...ctx, _error: { code: 'HOUSE_LIST_FAIL', message: error.message, retryable: true } };
  }
  return {
    ...ctx,
    payload: { ...ctx.payload, houses: data || [] },
    _error: null,
  };
}

/** slug (+ optional owner_key) 로 단건 조회 — OS getHouse와 동일 계약 */
export async function getHouse(ctx) {
  const { slug, owner_key } = ctx.payload || {};
  if (!slug) {
    return { ...ctx, _error: { code: 'MISSING_PARAMS', message: 'slug 필수', retryable: false } };
  }
  const supabase = await getStorage();
  if (!supabase) {
    return { ...ctx, _error: { code: 'DB_FAIL', message: 'DB connection failed', retryable: true } };
  }
  let query = supabase.from('corenull_houses').select('*').eq('slug', slug);
  if (owner_key) query = query.eq('owner_key', owner_key);
  const { data, error } = await query.single();
  if (error || !data) {
    return { ...ctx, _error: { code: 'NOT_FOUND', message: '하우스 없음', retryable: false } };
  }
  return {
    ...ctx,
    payload: { ...ctx.payload, house: data },
    _error: null,
  };
}
