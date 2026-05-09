const message = async (ctx) => {
  const { payload, traceId } = ctx;
  if (payload && payload.text) {
    // TODO: storage.js를 통해 메시지 저장
    return { ...ctx, payload: { received: true }, success: true };
  }
  return { ...ctx, _error: 'Invalid message payload' };
};

export default message;