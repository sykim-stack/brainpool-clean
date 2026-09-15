// brain-engine/engines/language/detect.js
// ─────────────────────────────────────────────────────────────
// 언어 감지 — 범용
// 번역, 채팅, 게시글 어디서든 재사용
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

export async function detect(ctx) {
  const text = ctx.payload?.text;

  if (!text) {
    return { ...ctx, _error: 'detect: text 필드가 필요합니다' };
  }

  const sourceLang = /[가-힣]/.test(text) ? 'ko' : 'vi';

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      sourceLang,
    }
  };
}