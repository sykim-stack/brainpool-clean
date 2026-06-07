const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/engines/chat/room.js';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  "  const { data, error } = await supabase.from('chat_rooms').select('*').order('created_at', { ascending: false });",
  "  const { data, error } = await supabase.from('chat_rooms').select('*').eq('is_public', true).order('created_at', { ascending: false });"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
