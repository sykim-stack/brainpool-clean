const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/layout.tsx';
let content = fs.readFileSync(path, 'utf8');

// manifest 추가
content = content.replace(
  "  title: 'CORE-RING ENGINE',",
  "  manifest: '/manifest.json',\n  title: 'CORE-RING ENGINE',"
);

// sw 등록
content = content.replace(
  '<body>{children}</body>',
  '<body><script dangerouslySetInnerHTML={{ __html: `if (\'serviceWorker\' in navigator) { window.addEventListener(\'load\', function() { navigator.serviceWorker.register(\'/sw.js\'); }); }` }} />{children}</body>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료');
console.log('manifest:', content.includes('manifest'));
console.log('sw:', content.includes('serviceWorker'));
