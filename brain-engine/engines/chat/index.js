// brain-engine/engines/chat/index.js

const message = require('./message');
const room    = require('./room');

// rooms/route.ts, send/route.ts 호환
const ChatEngine = { message, room };

module.exports = { message, room, ChatEngine };