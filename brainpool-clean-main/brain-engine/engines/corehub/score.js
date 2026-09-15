// brain-engine/engines/corehub/score.js
// [CONNECT] OS engines/corehub/score.js 공식 그대로 포팅 (읽기 전용 연결)
// 포스트: 10점, 집 보유: 20점, 방문: 2점
// 주의: messages.type='post'만 집계. chat은 포함하지 않음 (공식 변경 금지)

import { getStorage } from '../../connectors/storage.js';

export async function calcScore(ctx) {
  const { owner_key } = ctx.payload || {};
  if (!owner_key) {
    return { ...ctx, _error: { code: 'MISSING_OWNER_KEY', message: 'owner_key 필요', retryable: false } };
  }

  const supabase = await getStorage();
  if (!supabase) {
    return { ...ctx, _error: { code: 'DB_FAIL', message: 'DB connection failed', retryable: true } };
  }

  // 포스트 수 (OS 원본과 동일: type=post, owner 필터 없음)
  const { data: posts, error: postError } = await supabase
    .from('messages')
    .select('id', { count: 'exact' })
    .eq('type', 'post');

  if (postError) {
    return { ...ctx, _error: { code: 'SCORE_POST_FAIL', message: postError.message, retryable: true } };
  }

  // 방 수 (집주인으로서)
  const { data: houses, error: houseError } = await supabase
    .from('corenull_houses')
    .select('id', { count: 'exact' })
    .eq('owner_key', owner_key);

  if (houseError) {
    return { ...ctx, _error: { code: 'SCORE_HOUSE_FAIL', message: houseError.message, retryable: true } };
  }

  // 발자취 수 (방문한 곳)
  const { data: footprints, error: footError } = await supabase
    .from('corenull_footprints')
    .select('id', { count: 'exact' })
    .eq('owner_key', owner_key);

  if (footError) {
    return { ...ctx, _error: { code: 'SCORE_FOOT_FAIL', message: footError.message, retryable: true } };
  }

  const postCount = posts?.length || 0;
  const houseCount = houses?.length || 0;
  const footCount = footprints?.length || 0;
  const score = postCount * 10 + houseCount * 20 + footCount * 2;

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      score,
      score_detail: { postCount, houseCount, footCount },
    },
    _error: null,
  };
}
