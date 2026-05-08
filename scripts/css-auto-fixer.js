// scripts/css-auto-fixer.js
const fs = require('fs');
const path = require('path');

const tokenMap = {
    '#ffffff': 'var(--color-text)',
    '#0F172A': 'var(--color-bg)',
    '#1E293B': 'var(--color-surface)',
    'fontSize: 24px': 'className={styles.translated}',
    'fontSize: 18px': 'className={styles.original}',
    'opacity: 0.6': 'className={styles.original}',
    'fontWeight: bold': 'className={styles.translated}',
};

const fixFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    Object.entries(tokenMap).forEach(([pattern, replacement]) => {
        if (content.includes(pattern)) {
            content = content.replaceAll(pattern, replacement);
            changed = true;
            console.log(`🔧 ${filePath}: '${pattern}' → '${replacement}'`);
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content);
    }
};

const walkDir = (dir) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            walkDir(fullPath);
        } else if (entry.name.match(/\.tsx$/)) {
            fixFile(fullPath);
        }
    });
};

console.log('🛡️ BRAINPOOL CSS Auto-Fixer 시작...');
walkDir('./components');
walkDir('./app');
console.log('✅ 치료 완료. Vercel 재배포를 권장합니다.');