export class CultureLayer {
  async process(ctx) {
    // 예시: 충돌 단어 사전 (간단)
    const conflictMap = {
      '이모': 'trong cô (북부) vs dì (남부)'
    };
    const text = ctx.payload.translatedText || '';
    let conflicts = [];
    for (const [word, note] of Object.entries(conflictMap)) {
      if (text.includes(word)) conflicts.push({ word, note });
    }

    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        culturalNote: conflicts.length ? '주의: 문화 충돌 단어 있음' : '중립',
        conflicts
      }
    };
  }
}