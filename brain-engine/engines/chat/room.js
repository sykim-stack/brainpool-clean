const room = async (ctx) => {
  const { type, payload, traceId } = ctx;
  if (type === 'LIST_ROOMS') {
    // TODO: storage.js를 통해 방 목록 조회
    return { ...ctx, payload: { rooms: [] }, success: true };
  }
  if (type === 'CREATE_ROOM') {
    // TODO: storage.js를 통해 방 생성
    return { ...ctx, payload: { room: { id: 'temp-id', ...payload } }, success: true };
  }
  return { ...ctx, _error: `Unknown room action: ${type}` };
};

export default room;