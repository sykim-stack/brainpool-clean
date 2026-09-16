// scripts/validate-all.js
const fs = require('fs');
const path = require('path');
const { runValidator } = require('./contract-validator-v2');

const targetDirs = ['./app', './brain-engine', './components'];

function walkDir(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...walkDir(fullPath));
    } else if (entry.name.match(/\.(tsx?|jsx?|css)$/)) {
      files.push(fullPath);
    }
  });
  return files;
}

console.log('🛡️ BRAINPOOL 계약서 전수 검사 시작...\n');
let totalViolations = 0;
let totalFiles = 0;
let totalFatalErrors = 0;

targetDirs.forEach(dir => {
  const files = walkDir(dir);
  files.forEach(file => {
    const result = runValidator(file);
    totalFiles++;
    totalViolations += result?.stats?.violations || 0;
    if (result?._error) totalFatalErrors++;
  });
});

console.log(`\n📊 전체 검사 완료: ${totalFiles}개 파일 검사됨.`);
console.log(`⚠️ 전체 위반: ${totalViolations}건`);
console.log(`❌ 치명적 오류: ${totalFatalErrors}건`);

if (totalViolations > 0 || totalFatalErrors > 0) {
  console.error('❌ 계약서 검증 실패');
  process.exit(1);
}

console.log('✅ 계약서 검증 통과');