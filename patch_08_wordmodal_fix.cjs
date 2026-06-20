const fs = require('fs');
const path = 'G:\\brainpool-clean\\app\\page.tsx';

let src = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

const oldBlock = `    Notification.requestPermission().then(permission => {
        if (permission === 'granted') subscribePush(deviceId);
      });`;

const newBlock = `    if (typeof Notification !== 'undefined' && Notification.requestPermission) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') subscribePush(deviceId);
        }).catch(() => {});
      }`;

if (!src.includes(oldBlock)) {
  // 공백 변형 시도
  const alt = `    Notification.requestPermission().then(permission => {\n        if (permission === 'granted') subscribePush(deviceId);\n      });`;
  if (src.includes(alt)) {
    src = src.replace(alt, newBlock);
    fs.writeFileSync(path, src, 'utf8');
    console.log('✅ Notification 안전 처리 완료 (alt)');
  } else {
    // 위치만 찾아서 라인 기반으로 교체
    const lines = src.split('\n');
    const idx = lines.findIndex(l => l.includes('Notification.requestPermission()'));
    if (idx === -1) { console.error('❌ 라인 못 찾음'); process.exit(1); }
    lines.splice(idx, 3,
      `    if (typeof Notification !== 'undefined' && Notification.requestPermission) {`,
      `        Notification.requestPermission().then(permission => {`,
      `          if (permission === 'granted') subscribePush(deviceId);`,
      `        }).catch(() => {});`,
      `      }`
    );
    fs.writeFileSync(path, lines.join('\n'), 'utf8');
    console.log('✅ Notification 안전 처리 완료 (line)');
  }
} else {
  src = src.replace(oldBlock, newBlock);
  fs.writeFileSync(path, src, 'utf8');
  console.log('✅ Notification 안전 처리 완료');
}