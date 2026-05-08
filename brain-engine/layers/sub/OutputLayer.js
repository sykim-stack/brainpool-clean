// brain-engine/layers/sub/OutputLayer.js
export class OutputLayer {
  async process(ctx) {
    const message = {
      id: crypto.randomUUID(),
      type: 'post',
      author: ctx.payload.author || 'anonymous',
      createdAt: Date.now(),
      payload: {
        original: ctx.payload.text,
        translated: ctx.payload.translatedText || ctx.payload.text
      },
      traceId: ctx.traceId,
      meta: {
        sourceLang: ctx.payload.sourceLang,
        targetLang: ctx.payload.targetLang || 'vi',
        translationSource: ctx.payload.translationSource,
        emotionScore: ctx.payload.emotionScore,
        culturalNote: ctx.payload.culturalNote,
        dialect: ctx.payload.dialect,
        intent: ctx.payload.intent,
        riskScore: ctx.payload.riskScore,
        conflicts: ctx.payload.conflicts || []
      }
    };
    // 출력 레이어는 최종적으로 message만 남기고 나머지 payload 정리
    return { ...ctx, payload: { ...ctx.payload, message } };
  }
}