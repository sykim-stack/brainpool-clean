// fill-example-southern.mjs
// Gemini API로 tp_translations의 NULL example_southern 채우기 (메콩/남부 방언)
import { createClient } from '@supabase/supabase-js';

// ── 환경변수 ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grlfocvlfatuvphkyivd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdybGZvY3ZsZmF0dXZwaGt5aXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDM1MzksImV4cCI6MjA4NTkxOTUzOX0.4dLzD1AYSuigxU_Q5ZZwZ6XDGejMvbuoYIjmB4D7dxo';
const GEMINI_KEY   = process.env.GEMINI_API_KEY || 'AIzaSyAvvp9RHl3RNLBnOW2h5uKwPfKQFG_VD1I';

if (!SUPABASE_KEY || !GEMINI_KEY) {
  console.error('❌ 환경변수 누락: SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: {
    headers: {
      'Accept-Profile': 'tp',
      'Content-Profile': 'tp',
    }
  }
});

// ── Gemini API 호출 (남부 방언) ─────────────────────────────────────
async function generateExamplesBatch(rows) {
  const wordList = rows.map((r, i) =>
    `${i + 1}. 단어: ${r.standard_word} | 뜻: ${r.meaning_ko} | 품사: ${r.part_of_speech || '미상'}`
  ).join('\n');

  const prompt = `당신은 베트남 남부(메콩 삼각주 / 사이고ン 스타일) 방언 전문가입니다.
아래 베트남어 단어 목록 각각에 대해 **남부 자연스러운 대화체 예문** 1개씩 생성하세요.

예문 규칙:
- 남부 방언(Nam Bộ) 스타일로 작성 (hông, dzô, bữa nay, ráng, v.v. 적극 사용)
- 실제 메신저·연인·친구·가족 간 일상 대화체 우선
- 7~15단어 정도
- 초급~중급 수준 어휘
- 반드시 해당 단어를 자연스럽게 포함
- 북부 표준어 느낌 완전 배제

남부 특징 반영 예시:
- hôm nay → bữa nay
- không → hông
- anh/em → tui / mày / bồ / anh (상황에 따라)
- rất → dữ lắm, cực kỳ
- đi → dzô, đi chơi, đi mần
- 자연스럽고 친근한 느낌 강조

좋은 예:
- nhớ → Bữa nay tui nhớ mày dữ lắm.
- ăn → Ăn cơm chưa? Bữa nay đồ ăn ngon lắm.
- buồn → Tui buồn hông chịu nổi luôn.
- đẹp → Chiếc áo này mặc vô đẹp dữ.

응답 형식 (JSON만, 마크다운 없이):
{"results": ["예문1", "예문2", ...]}

단어 목록:
${wordList}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.75,   // 남부 방언은 좀 더 자유롭게
          maxOutputTokens: 1500
        }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API 오류: ${res.status} - ${errText.substring(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`JSON 파싱 실패: ${text.substring(0, 200)}`);

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.results;
}

// validateExample와 updateBatch 함수는 northern과 동일하게 사용
function validateExample(example, standardWord) {
  if (!example || typeof example !== 'string') return false;
  if (example.trim().length < 5) return false;

  const wordLower = standardWord.toLowerCase();
  const exLower = example.toLowerCase();
  const wordRoot = wordLower.split(' ')[0];

  if (!exLower.includes(wordRoot)) return false;

  return true;
}

async function updateBatch(rows, results) {
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const example = results[i]?.trim();

    if (!example) {
      console.warn(`  ⚠️ 빈 예문 for "${rows[i].standard_word}" → 스킵`);
      skipCount++;
      continue;
    }

    if (!validateExample(example, rows[i].standard_word, rows[i].southern_word)) {
      console.warn(`  ⚠️ 단어 미포함 "${rows[i].standard_word}" → "${example}" → 스킵`);
      skipCount++;
      continue;
    }

    const { error } = await supabase
      .from('tp_translations')
      .update({ example_southern: example })
      .eq('id', rows[i].id);

    if (error) {
      console.error(`  ❌ 업데이트 실패 "${rows[i].standard_word}": ${error.message}`);
      errorCount++;
    } else {
      successCount++;
    }
  }

  return { successCount, errorCount, skipCount };
}

// ── 메인 ───────────────────────────────────────────────────────
async function main() {
  console.log('🚀 example_southern (메콩 방언) 채우기 시작\n');

  const { data: rows, error } = await supabase
    .from('tp_translations')
    .select('id, standard_word, meaning_ko, part_of_speech')
    .is('example_southern', null)
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Supabase 조회 실패:', error.message);
    process.exit(1);
  }

  console.log(`📊 처리 대상: ${rows.length}개\n`);

  const BATCH_SIZE = 20;
  const DELAY_MS = 1200;   // 남부 프롬프트가 조금 더 무거울 수 있어서 약간 여유

  let totalSuccess = 0;
  let totalError = 0;
  let totalSkip = 0;
  let batchNum = 0;
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = rows.slice(i, i + BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatches}] "${batch[0].standard_word}" ... `);

    try {
      const results = await generateExamplesBatch(batch);
      const { successCount, errorCount, skipCount } = await updateBatch(batch, results);
      
      totalSuccess += successCount;
      totalError += errorCount;
      totalSkip += skipCount;

      console.log(`✅ ${successCount}개 완료${skipCount > 0 ? ` (스킵 ${skipCount})` : ''}`);

    } catch (err) {
      console.error(`❌ 배치 실패: ${err.message}`);
      totalError += batch.length;
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n🎉 메콩 방언 example_southern 채우기 완료!`);
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`⚠️ 스킵: ${totalSkip}개`);
  console.log(`❌ 실패: ${totalError}개`);
}

main().catch(err => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});