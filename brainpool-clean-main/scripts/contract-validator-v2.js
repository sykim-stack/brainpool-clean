// scripts/contract-validator-v2.js
const fs = require('fs');
const path = require('path');

// 1. 초기 컨텍스트 설정
const initCtx = (filePath) => ({
    filePath,
    content: '',
    lines: [],
    violations: [],
    _error: null,
    stats: { checks: 0, violations: 0 }
});

// 2. 파일 읽기 및 라인 분리
const readFile = (ctx) => {
    if (ctx._error) return ctx;
    try {
        ctx.content = fs.readFileSync(ctx.filePath, 'utf8');
        ctx.lines = ctx.content.split('\n');
    } catch (e) {
        ctx._error = `파일 읽기 실패: ${e.message}`;
    }
    return ctx;
};

// 3. 고도화된 계약서 위반 검사
const validateContract = (ctx) => {
    if (ctx._error) return ctx;

    const rules = [
        {
            id: 'NO-THROW',
            pattern: /\bthrow\b/g,
            message: '🚨 [계약서] throw 사용 금지. ctx._error를 사용하세요.'
        },
        {
            id: 'UTF8-ONLY',
            pattern: /\.json\(\)/g,
            message: '🚨 [백신] req.json() 금지. req.text() + JSON.parse()를 사용하세요.'
        },
        {
            id: 'CTX-PATTERN',
            pattern: /async\s+\w+\s*\((?!ctx\b)\w*\)/g,
            message: '🚨 [계약서] 모든 함수는 (ctx) => ctx 형태여야 합니다.'
        },
        {
            id: 'UUID-SAFE',
            pattern: /['"](?:shark|room_\w+)['"]/g,
            message: '🚨 [백신] UUID 컬럼에 하드코딩된 문자열 삽입 금지.'
        },
        {
            id: 'LANG-MAP',
            pattern: /(?!meta\.sourceLang|payload\.translated)\b(srcLang|transText|translatedText)\b/g,
            message: '🚨 [백신] 고정 필드명(meta.sourceLang, payload.translated)을 사용하세요.'
        },
        {
            id: 'DATA-CYCLE',
            pattern: /\.insert\(.*\)(?!\s*\.filter\((?:emotion|context)Filter\))/g,
            message: '🚨 [백신] 데이터 저장 전 emotionFilter/contextFilter 통과가 강제됩니다.'
        }
    ];

    rules.forEach(rule => {
        let match;
        // global flag가 있는 regex를 위해 exec 반복 사용
        while ((match = rule.pattern.exec(ctx.content)) !== null) {
            const lineNo = ctx.content.substring(0, match.index).split('\n').length;
            ctx.violations.push({
                ruleId: rule.id,
                line: lineNo,
                snippet: ctx.lines[lineNo - 1].trim(),
                message: rule.message
            });
            ctx.stats.violations++;
        }
        ctx.stats.checks++;
    });

    return ctx;
};

// 4. 결과 리포트 생성
const reportResult = (ctx) => {
    console.log(`\n==================================================`);
    console.log(`🛡️  BRAINPOOL ContractValidator v0.2 Report`);
    console.log(`🔍 Target: ${ctx.filePath}`);
    console.log(`==================================================`);

    if (ctx._error) {
        console.error(`❌ FATAL ERROR: ${ctx._error}`);
        return ctx;
    }

    if (ctx.violations.length === 0) {
        console.log(`✅ All rules passed! (${ctx.stats.checks} rules checked)`);
    } else {
        console.log(`⚠️  Found ${ctx.violations.length} violations:`);
        
        // 라인 번호 순으로 정렬하여 출력
        ctx.violations.sort((a, b) => a.line - b.line).forEach(v => {
            console.log(`\n[Line ${v.line}] ${v.ruleId}`);
            console.log(`  Message: ${v.message}`);
            console.log(`  Code:    \x1b[31m${v.snippet}\x1b[0m`); // 위반 코드를 빨간색으로 표시
        });
    }
    
    console.log(`\n--------------------------------------------------`);
    console.log(`Summary: ${ctx.stats.violations} issues found in ${ctx.stats.checks} rules.`);
    console.log(`==================================================\n`);
    
    return ctx;
};

// 실행 파이프라인
const runValidator = (filePath) => {
    const pipeline = [readFile, validateContract, reportResult];
    pipeline.reduce((ctx, fn) => fn(ctx), initCtx(filePath));
};

module.exports = { runValidator };