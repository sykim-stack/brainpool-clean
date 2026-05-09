// brain-engine/engines/chat/message.js
// ─────────────────────────────────────────────────────────────
// ChatMessageEngine — 메시지 저장/조회
// chat-message-layer를 엔진으로 승격
// (ctx) => ctx 형태 준수, throw 금지
// ─────────────────────────────────────────────────────────────

const ChatMessageLayer = require('../../layers/sub/chat-message-layer');

module.exports = ChatMessageLayer;