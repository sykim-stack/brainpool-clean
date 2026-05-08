// brain-engine/layers/sub/MeaningLayer.js에 추가

export class MeaningLayer {
  async process(ctx) {
    const text = ctx.payload.translatedText || ctx.payload.text;
    
    // 감정 분석 (키워드 기반)
    const emotion = this.analyzeEmotion(text);
    
    return {
      ...ctx,
      payload: {
        ...ctx.payload,
        emotion: emotion.label,
        emotionScore: emotion.score,
      },
    };
  }

  analyzeEmotion(text) {
    const lower = text.toLowerCase();
    
    // 베트남어 긍정 키워드
    const viPositive = ['vui', 'thích', 'yêu', 'cảm ơn', 'tốt', 'đẹp', 'hạnh phúc', 'tuyệt vời', 'ngon', 'khỏe'];
    // 베트남어 부정 키워드
    const viNegative = ['buồn', 'giận', 'ghét', 'tệ', 'xấu', 'mệt', 'bệnh', 'đau', 'chán', 'lo lắng'];
    
    // 한국어 긍정 키워드
    const koPositive = ['기쁘', '좋', '사랑', '감사', '행복', '맛있', '잘', '예쁘', '최고', '고마워'];
    // 한국어 부정 키워드
    const koNegative = ['슬프', '화나', '싫', '나쁘', '힘들', '아프', '피곤', '짜증', '걱정', '속상'];
    
    let score = 0.5; // 기본값: 중립
    let label = 'neutral';
    
    // 긍정 키워드 검사
    for (const word of [...viPositive, ...koPositive]) {
      if (lower.includes(word)) {
        score += 0.2;
        label = 'joy';
        break;
      }
    }
    
    // 부정 키워드 검사
    for (const word of [...viNegative, ...koNegative]) {
      if (lower.includes(word)) {
        score -= 0.3;
        label = 'sad';
        break;
      }
    }
    
    // 범위 제한
    score = Math.max(0, Math.min(1, score));
    
    return { label, score };
  }
}