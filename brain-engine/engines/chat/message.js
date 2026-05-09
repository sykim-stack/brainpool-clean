const message = async (ctx: any) => {
  const { payload, traceId } = ctx;
  if (payload.text) {
    // 여기에 메시지 저장 로직 추가
    return { ...ctx, payload: { received: true }, success: true };
  }
  return { ...ctx, _error: 'Invalid message payload' };
};
export default message; // default export 추가