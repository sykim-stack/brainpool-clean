// brain-engine/engines/emotion/analyze.js
// ─────────────────────────────────────────────────────────────
// 감정 분석 — TranslationEngine과 완전 분리
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

const KO_POSITIVE = ['기쁘', '좋', '사랑', '감사', '행복', '맛있', '잘', '예쁘', '최고', '고마워'];
const KO_NEGATIVE = ['슬프', '화나', '싫', '나쁘', '힘들', '아프', '피곤', '짜증', '걱정', '속상'];
const VI_POSITIVE = ['vui', 'thích', 'yêu', 'cảm ơn', 'tốt', 'đẹp', 'hạnh phúc', 'tuyệt vời', 'ngon', 'khỏe'];
const VI_NEGATIVE = ['buồn', 'giận', 'ghét', 'tệ', 'xấu', 'mệt', 'bệnh', 'đau', 'chán', 'lo lắng'];

export async function analyze(ctx) {
  const text = ctx.payload?.translatedText || ctx.payload?.text;
  if (!text) return ctx;

  const lower = text.toLowerCase();
  let score = 0.5;
  let label = 'neutral';

  for (const word of [...VI_POSITIVE, ...KO_POSITIVE]) {
    if (lower.includes(word)) { score = Math.min(1, score + 0.2); label = 'joy'; break; }
  }
  for (const word of [...VI_NEGATIVE, ...KO_NEGATIVE]) {
    if (lower.includes(word)) { score = Math.max(0, score - 0.3); label = 'sad'; break; }
  }

  return {
    ...ctx,
    payload: {
      ...ctx.payload,
      emotion: label,
      emotionScore: score,
    }
  };
}