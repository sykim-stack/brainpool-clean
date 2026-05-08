// modules/gemini-sync-layer.js
export async function GeminiSyncLayer(ctx) {
  if (!ctx.payload || (!ctx.payload.rawText && !ctx.payload.aiConversation)) {
    return ctx;
  }

  const rawText = ctx.payload.rawText || ctx.payload.aiConversation;

  try {
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      console.warn('Gemini API 키가 설정되지 않았습니다.');
      ctx._error = 'Gemini API 키가 필요합니다.';
      return ctx;
    }

    const prompt = `당신은 BRAINPOOL OS 프로젝트의 맥락 정리 전문가입니다.
다음 AI와의 대화 내용을 분석하여, 아래 JSON 형식으로 정리해주세요.
JSON 이외의 설명은 절대 포함하지 마세요.

{
  "last_task": "현재 진행 중인 작업 (한국어 1문장)",
  "code_context": "작업 중인 파일들 (예: api/posts.js, event.html)",
  "current_problems": "발생한 문제나 막힌 부분 (없으면 null)",
  "decisions": "오늘 내린 중요한 결정사항 (없으면 null)",
  "next_tasks": ["다음 할 작업 1", "다음 할 작업 2"],
  "summary": "오늘 작업에 대한 2-3문장 요약"
}

대화 내용:
${rawText}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawOutput) {
      ctx._error = 'Gemini 응답이 비어있습니다.';
      return ctx;
    }

    const start = rawOutput.indexOf('{');
    const end = rawOutput.lastIndexOf('}') + 1;
    const jsonStr = rawOutput.substring(start, end);
    const parsed = JSON.parse(jsonStr);

    ctx.contextUpdate = {
      last_task: parsed.last_task || '',
      code_context: parsed.code_context || undefined,
      current_problems: parsed.current_problems || null,
      decisions: parsed.decisions || undefined,
      next_tasks: parsed.next_tasks ? JSON.stringify(parsed.next_tasks) : undefined,
      summary: parsed.summary || '',
    };

    console.log('✅ [GeminiSync] 맥락 정리 완료:', parsed.last_task);
  } catch (e) {
    console.error('❌ [GeminiSync] 처리 실패:', e.message);
    ctx._error = `GeminiSync 실패: ${e.message}`;
  }

  return ctx;
}

async function getGeminiApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      resolve(result.geminiApiKey || null);
    });
  });
}