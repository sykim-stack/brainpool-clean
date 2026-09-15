const fs = require('fs');
const path = 'app/api/chat/route.ts';
let content = fs.readFileSync(path, 'utf8');

const before = "url: '/'";
const after = "url: '/?room=' + roomId";

if (content.includes(after)) {
  console.log('SKIP already applied');
} else if (content.includes(before)) {
  content = content.replace(before, after);
  fs.writeFileSync(path, content, 'utf8');
  console.log('OK push url updated with room_id');
} else {
  console.log('X target string not found - check file manually');
}
