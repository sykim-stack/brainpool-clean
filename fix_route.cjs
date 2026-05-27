const fs = require('fs');
const path = "C:/brainpool-clean/brainpool-clean/app/api/chat/rooms/[roomId]/route.ts";
let content = fs.readFileSync(path, 'utf8');

const patch = export async function PATCH(
  request,
  { params }
) {
  const traceId = crypto.randomUUID();
  const { roomId } = await params;
  try {
    const { ChatRoomEngine } = await import('@/brain-engine/engines/chat/room.js');
    const result = await ChatRoomEngine({
      type:    'CLEAR_MESSAGES',
      payload: { roomId },
      traceId,
      _error:  null,
    });
    if (result._error) {
      return Response.json({ payload: null, _error: result._error, traceId }, { status: 500 });
    }
    return Response.json({ payload: { cleared: true }, _error: null, traceId });
  } catch (err) {
    return Response.json({ payload: null, _error: err.message, traceId }, { status: 500 });
  }
}

;

content = patch + content;
fs.writeFileSync(path, content, 'utf8');
console.log('route.ts 수정 완료');
