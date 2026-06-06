const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 중복 import 제거
const double = "import ShareRoomModal from '@/components/ShareRoomModal';\nimport ShareRoomModal from '@/components/ShareRoomModal';";
const single = "import ShareRoomModal from '@/components/ShareRoomModal';";
content = content.replace(double, single);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
