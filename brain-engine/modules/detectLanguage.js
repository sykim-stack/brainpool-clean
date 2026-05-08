export async function detectLanguage(ctx) {
  const text = ctx.payload.text;
  const sourceLang = /[가-힣]/.test(text) ? 'ko' : 'vi';
  return { ...ctx, payload: { ...ctx.payload, sourceLang } };
}