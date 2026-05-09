// brain-engine/engines/chat/room.js

const ChatRoomLayer = require('../../layers/sub/chat-room-layer');

async function room(ctx) {
  const result = await ChatRoomLayer(ctx);
  
  if (result._error) {
    return {
      success: false,
      traceId: result.traceId || ctx.traceId,
      error: result._error,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    traceId: result.traceId || ctx.traceId,
    data: {
      room:  result.room  || null,
      rooms: result.rooms || null,
    },
    timestamp: new Date().toISOString(),
  };
}

module.exports = room;