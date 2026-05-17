export async function detect(ctx) {
    const text = ctx.payload?.text;
    if (!text) return { ...ctx, _error: { code: 'MISSING_TEXT', message: 'text 필드 필요', retryable: false } };
    const sourceLang = /[가-힣]/.test(text) ? 'ko' : 'vi';
    return { ...ctx, payload: { ...ctx.payload, sourceLang } };
}