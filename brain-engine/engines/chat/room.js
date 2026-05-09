// brain-engine/engines/chat/room.js
// ─────────────────────────────────────────────────────────────
// ChatRoomEngine — 방 CRUD
// chat-room-layer를 엔진으로 승격
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

const ChatRoomLayer = require('../../layers/sub/chat-room-layer');

module.exports = ChatRoomLayer;