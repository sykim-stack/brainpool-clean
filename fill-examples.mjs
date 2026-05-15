// fill-examples.mjs
// Gemini API로 tp_translations의 example_northern, example_southern 채우기
// 실행: node fill-examples.mjs
//
// 필요 환경변수:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   GEMINI_API_KEY

import { createClient } from '@supabase/supabase-js';

// ── 환경변수 ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grlfocvlfatuvphkyivd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybGZvY3ZsZmF0dXZwaGt5aXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDM1MzksImV4cCI6MjA4NTkxOTUzOX0.4dLzD1AYSuigxU_Q5ZZwZ6XDGejMvbuoYIjmB4D7dxo';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || 'AIzaSyB4Ca8iqo4asPMEO0PCIMHbV_Sw1g7guFA';

if (!SUPABASE_KEY || !GEMINI_KEY) {
  console.error('❌ 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Gemini API 호출 ─────────────────────────────────────────────
async function generateExamples(rows) {
  const wordList = rows.map((r, i) => 
    `${i + 1}. 표준어: "${r.standard_word}" | 남부방언: "${r.southern_word || r.standard_word}" | 뜻: "${r.meaning_ko || ''}"`
  ).join('\n');

  const prompt = `다음은 베트남어 단어/표현 목록입니다.
각 항목에 대해 북부(하노이) 예문과 남부(호치민) 예문을 각각 1개씩 만들어주세요.

규칙:
- 예문은 실제 일상 대화에서 쓰는 자연스러운 베트남어로 작성
- 북부 예문은 표준어(standard_word) 사용
- 남부 예문은 남부방언(southern_word) 사용
- 예문 길이: 5~15단어 내외
- 한국어 번역 포함 (괄호 안에)
- 시니어(50~70대)가 이해할 수 있는 일상적 표현

응답 형식 (JSON만, 다른 텍스트 없이):
{
  "results": [
    {
      "north": "북부 예문 (한국어 번역)",
      "south": "남부 예문 (한국어 번역)"
    }
  ]
}

단어 목록:
${wordList}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류: ${res.status} - ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`JSON 파싱 실패: ${text.substring(0, 200)}`);

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.results;
}

// ── Supabase 업데이트 ───────────────────────────────────────────
async function updateBatch(rows, results) {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const result = results[i];
    if (!result || !result.north || !result.south) {
      console.warn(`  ⚠️ 결과 없음 "${rows[i].standard_word}" → 스킵`);
      errorCount++;
      continue;
    }

    const { error } = await supabase
      .from('tp_translations')
      .update({
        example_northern: result.north,
        example_southern: result.south,
      })
      .eq('id', rows[i].id);

    if (error) {
      console.error(`  ❌ 업데이트 실패 "${rows[i].standard_word}": ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  return { successCount, errorCount };
}

// ── 메인 ───────────────────────────────────────────────────────
async function main() {
  console.log('🚀 example_northern / example_southern 채우기 시작\n');

  // example_northern이 없는 것 조회 (example_southern도 같이 채움)
  const { data: rows, error } = await supabase
    .from('tp_translations')
    .select('id, standard_word, southern_word, meaning_ko')
    .is('example_northern', null)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (error) {
    console.error('❌ Supabase 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📊 처리 대상: ${rows.length}개\n`);

  const BATCH_SIZE = 10; // 예문 생성은 10개씩 (응답이 길어서 작게)
  const DELAY_MS = 1500;

  let totalSuccess = 0;
  let totalError = 0;
  let batchNum = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = rows.slice(i, i + BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatches}] "${batch[0].standard_word}" ... `);

    try {
      const results = await generateExamples(batch);

      if (!results || results.length !== batch.length) {
        console.warn(`⚠️ 응답 수 불일치 (기대: ${batch.length}, 받음: ${results?.length})`);
      }

      const { successCount, errorCount } = await updateBatch(batch, results || []);
      totalSuccess += successCount;
      totalError += errorCount;

      console.log(`✅ ${successCount}개 완료`);

    } catch (err) {
      console.error(`❌ 배치 실패: ${err.message}`);
      totalError += batch.length;
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n🎉 완료!`);
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`❌ 실패/스킵: ${totalError}개`);
  console.log(`📊 총계: ${totalSuccess + totalError}개`);
}

main().catch(err => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});
