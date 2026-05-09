// 이 함수는 반드시 async (ctx) => ctx 형태여야 합니다.
const room = async (ctx: any) => {
  const { type, payload, traceId } = ctx;
  if (type === 'LIST_ROOMS') {
    // 여기에 DB 조회 로직 추가 (Storage connector 통해)
    return { ...ctx, payload: { rooms: [] }, success: true };
  }
  return { ...ctx, _error: 'Unknown room action' };
};
export default room; // default export 추가