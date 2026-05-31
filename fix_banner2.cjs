const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/app/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// translateCount state 추가
content = content.replace(
  'const [showRoomBanner, setShowRoomBanner] = useState(false);',
  'const [showRoomBanner, setShowRoomBanner] = useState(false);\n  const [langHistory, setLangHistory] = useState<string[]>([]);'
);

// 양방향 감지 로직 추가
content = content.replace(
  'setShowRoomBanner(true);',
  `// 양방향 대화 감지 (ko + vi 둘 다 있을 때만 배너)
      setLangHistory(prev => {
        const updated = [...prev, srcLang || 'unknown'];
        const hasKo = updated.includes('ko');
        const hasVi = updated.includes('vi');
        if (hasKo && hasVi) setShowRoomBanner(true);
        return updated;
      });`
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('langHistory') ? '성공' : '실패');
