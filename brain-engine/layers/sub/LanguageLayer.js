export class LanguageLayer {
  async process(ctx) {
    const text = ctx.payload.text;
    // 간단한 정규식 언어 감지 (확장 가능)
    const sourceLang = /[가-힣]/.test(text) ? 'ko' : 'vi';
    // 방언 감지 (초기값 neutral)
    const dialect = 'neutral';
    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        sourceLang,
        dialect,
        culturalContext: '기본'
      }
    };
  }
}