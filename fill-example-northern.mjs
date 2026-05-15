// fill-example-northern.mjs
// Gemini API로 tp_translations의 NULL example_northern 채우기 (개선 버전)

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://grlfocvlfatuvphkyivd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

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

// ── 개선된 Gemini 프롬프트 ─────────────────────────────────────
function createPrompt(wordList) {
  return `당신은 베트남 하노이 출신 원어민입니다.
아래 단어들을 실제 일상 대화(메신저, 연인, 친구 사이)에서 자연스럽게 사용하는 문장을 1개씩 만들어주세요.

규칙:
- 북부 표준 베트남어 사용 (남부 방언 절대 금지)
- 8~15단어 정도의 자연스러운 문장
- 초중급 수준 어휘
- 반드시 해당 단어를 자연스럽게 포함
- 사전식, 설명식 문장 절대 금지
- 감정, 상황, 관계가 느껴지는 문장 선호

좋은 예시:
- nhớ → Anh nhớ em quá, bao giờ về?
- đẹp → Em mặc váy này trông đẹp lắm.
- buồn → Hôm nay anh hơi buồn, em có rảnh không?

나쁜 예시 (금지):
- Đây là từ đẹp. (사전식)
- Từ này có nghĩa là... (설명식)

응답은 **JSON만** 출력하세요. 다른 설명 일절 금지:
{"results": ["예문1", "예문2", ...]}

단어 목록:
${wordList}`;
}

// ── 강화된 검증 함수 ───────────────────────────────────────────
function validateExample(example, standardWord) {
  if (!example || typeof example !== 'string') return false;
  
  const trimmed = example.trim();
  if (trimmed.length < 6 || trimmed.length > 120) return false;

  const exLower = trimmed.toLowerCase();
  const wordLower = standardWord.toLowerCase();

  // 1. 정확히 포함
  if (exLower.includes(wordLower)) return true;

  // 2. 어근 포함 (복합어 대응)
  const root = wordLower.split(/\s+/)[0];
  if (root.length >= 3 && exLower.includes(root)) return true;

  // 3. 부분 매칭 (베트남어 형태 변화 대응)
  if (root.length >= 2) {
    const regex = new RegExp(root.split('').join('.{0,3}'));
    if (regex.test(exLower)) return true;
  }

  return false;
}

// ── Gemini 배치 호출 ───────────────────────────────────────────
async function generateExamplesBatch(rows) {
  const wordList = rows.map((r, i) => 
    `${i+1}. 단어: ${r.standard_word} | 뜻: ${r.meaning_ko} | 품사: ${r.part_of_speech || '미상'}`
  ).join('\n');

  const prompt = createPrompt(wordList);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 800,
          topP: 0.9
        }
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API Error: ${res.status} - ${errText.substring(0, 150)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSON 추출 강화
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error('JSON 형식 응답을 받지 못함');

  const parsed = JSON.parse(jsonMatch[0]);
  return Array.isArray(parsed.results) ? parsed.results : [];
}

// ── 배치 업데이트 ─────────────────────────────────────────────
async function updateBatch(rows, results) {
  let success = 0, skip = 0, error = 0;

  for (let i = 0; i < rows.length; i++) {
    const example = results[i]?.trim();

    if (!example || !validateExample(example, rows[i].standard_word)) {
      console.warn(`  ⚠️ 스킵 "${rows[i].standard_word}" → ${example || '빈 응답'}`);
      skip++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('tp_translations')
      .update({ example_northern: example })
      .eq('id', rows[i].id);

    if (updateError) {
      console.error(`  ❌ 업데이트 실패 ${rows[i].standard_word}`);
      error++;
    } else {
      success++;
    }
  }

  return { success, skip, error };
}

// ── 메인 ───────────────────────────────────────────────────────
async function main() {
  console.log('🚀 example_northern 개선 버전 시작\n');

  const { data: rows } = await supabase
    .from('tp_translations')
    .select('id, standard_word, meaning_ko, part_of_speech')
    .is('example_northern', null)
    .order('id', { ascending: true });

  console.log(`📊 처리 대상: ${rows.length}개\n`);

  const BATCH_SIZE = 20;
  const DELAY = 1200;

  let totalSuccess = 0, totalSkip = 0, totalError = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatch = Math.ceil(rows.length / BATCH_SIZE);

    process.stdout.write(`[${batchNum}/${totalBatch}] ${batch[0].standard_word} ... `);

    try {
      const results = await generateExamplesBatch(batch);
      const stats = await updateBatch(batch, results);

      totalSuccess += stats.success;
      totalSkip += stats.skip;
      totalError += stats.error;

      console.log(`✅ ${stats.success} 성공${stats.skip ? ` (스킵 ${stats.skip})` : ''}`);
    } catch (err) {
      console.error(`❌ 배치 실패: ${err.message}`);
      totalError += batch.length;
    }

    if (i + BATCH_SIZE < rows.length) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  console.log(`\n🎉 작업 완료!`);
  console.log(`✅ 성공: ${totalSuccess}개`);
  console.log(`⚠️ 스킵: ${totalSkip}개`);
  console.log(`❌ 실패: ${totalError}개`);
}

main().catch(err => {
  console.error('💥 치명적 오류:', err);
  process.exit(1);
});