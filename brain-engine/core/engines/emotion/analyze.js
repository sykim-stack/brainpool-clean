const KO_POSITIVE = ['기쁘', '좋', '사랑', '감사', '행복', '맛있', '예쁘', '최고', '고마워'];
const KO_NEGATIVE = ['슬프', '화나', '싫', '나쁘', '힘들', '아프', '피곤', '짜증', '걱정'];
const VI_POSITIVE = ['vui', 'thich', 'yeu', 'cam on', 'tot', 'dep', 'hanh phuc', 'tuyet'];
const VI_NEGATIVE = ['buon', 'gian', 'ghet', 'te', 'xau', 'met', 'benh', 'dau', 'chan'];

export async function analyze(ctx) {
    const text = ctx.payload?.translatedText || ctx.payload?.text;
    if (!text) return ctx;

    const lower = text.toLowerCase();
    let score = 0.5;
    let label = 'neutral';

    for (const w of [...VI_POSITIVE, ...KO_POSITIVE]) {
        if (lower.includes(w)) { score = Math.min(1, score + 0.2); label = 'joy'; break; }
    }
    for (const w of [...VI_NEGATIVE, ...KO_NEGATIVE]) {
        if (lower.includes(w)) { score = Math.max(0, score - 0.3); label = 'sad'; break; }
    }

    return { ...ctx, payload: { ...ctx.payload, emotion: label, emotionScore: score } };
}