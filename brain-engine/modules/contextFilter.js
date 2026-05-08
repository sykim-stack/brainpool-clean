export async function contextFilter(ctx) {
  return { ...ctx, payload: { ...ctx.payload, culturalNote: '중립' } };
}