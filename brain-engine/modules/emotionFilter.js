export async function emotionFilter(ctx) {
  return { ...ctx, payload: { ...ctx.payload, emotionScore: 0.3 } };
}