import room from './room.js';
import message from './message.js';

export const ChatEngine = {
  room,
  message
};

// 필요하면 개별 export도 유지
export { room, message };