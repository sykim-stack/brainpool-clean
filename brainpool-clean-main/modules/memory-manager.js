// modules/memory-manager.js — HajunAI v5.0 두뇌 모듈

// ── 메모리 저장소 ──────────────────────────────────────────────
const memoryStore = {
  master: {
    title: 'BRAINPOOL OS 통합 마스터 문서 v1.0',
    content: `🧠 BRAINPOOL OS — 통합 마스터 문서 v1.0
...
(실제 문서 내용은 Supabase shark_memories 테이블에서 로드)`,
    updatedAt: '2026-05-05',
  },
  vaccine: {
    title: 'BRAINPOOL 통합 백신 v1.0',
    content: `🛡️ BRAINPOOL 통합 백신 v1.0
...
(실제 문서 내용은 Supabase shark_memories 테이블에서 로드)`,
    updatedAt: '2026-05-05',
  },
  contract: {
    title: 'BRAINPOOL 계약서 (contract.md)',
    content: `📜 BRAINPOOL 계약서
...
(실제 문서 내용은 Supabase shark_memories 테이블에서 로드)`,
    updatedAt: '2026-05-05',
  },
};

// ── 상황별 템플릿 ───────────────────────────────────────────────
const templates = {
  development: {
    label: '🛠️ 개발',
    includeMaster: true,
    includeVaccine: true,
    includeContract: true,
    prefix: `🦈 당신은 BRAINPOOL OS의 개발자입니다.
아래 마스터 문서, 백신, 계약서를 완전히 이해하고, 이 규칙에 따라 코드를 작성하세요.
모든 함수는 (ctx) => ctx 형태로 작성하고, throw는 절대 사용하지 않습니다.`,
    suffix: '이 규칙을 지키면서 작업을 시작하세요. 준비되었으면 "이해했습니다"라고 답하세요.',
  },
  debug: {
    label: '🔍 디버깅',
    includeMaster: false,
    includeVaccine: true,
    includeContract: false,
    prefix: `🦈 당신은 BRAINPOOL OS의 디버거입니다.
아래 백신을 기준으로 현재 발생한 문제를 분석하고, 원인을 찾아 해결하세요.
에러는 반드시 _error 필드로 반환되어야 합니다.`,
    suffix: '위 규칙을 기준으로 문제를 분석하고 해결 방안을 제시하세요.',
  },
  review: {
    label: '📋 코드 리뷰',
    includeMaster: false,
    includeVaccine: false,
    includeContract: true,
    prefix: `🦈 당신은 BRAINPOOL OS의 코드 리뷰어입니다.
아래 계약서를 기준으로 내가 붙여넣은 코드를 검토하세요.
계약서 위반 사항이 있으면 정확히 지적하고, 올바른 코드를 제시하세요.`,
    suffix: '위 계약서를 기준으로 코드를 검토하고 피드백을 주세요.',
  },
};

// ── 헬퍼 ──────────────────────────────────────────────────────
function buildPrompt(memoryType, templateKey) {
  const template = templates[templateKey];
  if (!template) return '';

  const parts = [template.prefix];

  if (template.includeMaster) {
    parts.push(`\n=== 📚 마스터 문서 ===\n${memoryStore.master.content}`);
  }
  if (template.includeVaccine) {
    parts.push(`\n=== 🛡️ 통합 백신 ===\n${memoryStore.vaccine.content}`);
  }
  if (template.includeContract) {
    parts.push(`\n=== 📜 계약서 ===\n${memoryStore.contract.content}`);
  }

  parts.push(template.suffix);
  return parts.join('\n\n');
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return { success: true };
  } catch {
    return { success: false, error: 'clipboard-failed' };
  }
}

// ── 메인 레이어 ─────────────────────────────────────────────────
export async function MemoryManager(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { action, payload = {} } = ctx;

  switch (action) {
    // 📋 메모리 목록 조회
    case 'list-memories':
      ctx.memories = Object.entries(memoryStore).map(([key, value]) => ({
        id: key,
        title: value.title,
        updatedAt: value.updatedAt,
      }));
      break;

    // 📝 메모리 내용 조회
    case 'get-memory':
      if (!payload.id || !memoryStore[payload.id]) {
        ctx._error = `메모리를 찾을 수 없습니다: ${payload.id}`;
        return ctx;
      }
      ctx.memory = memoryStore[payload.id];
      break;

    // ✏️ 메모리 업데이트
    case 'update-memory':
      if (!payload.id || !memoryStore[payload.id]) {
        ctx._error = `메모리를 찾을 수 없습니다: ${payload.id}`;
        return ctx;
      }
      if (!payload.content) {
        ctx._error = 'content는 필수입니다';
        return ctx;
      }
      memoryStore[payload.id].content = payload.content;
      memoryStore[payload.id].updatedAt = new Date().toISOString().slice(0, 10);
      ctx.memory = memoryStore[payload.id];
      break;

    // 🧠 상황별 프롬프트 생성
    case 'generate-prompt':
      if (!payload.template || !templates[payload.template]) {
        ctx._error = `지원하지 않는 템플릿입니다: ${payload.template}`;
        return ctx;
      }
      ctx.prompt = buildPrompt(payload.memoryType || 'full', payload.template);
      ctx.template = templates[payload.template].label;
      break;

    // 📋 클립보드 복사
    case 'copy-prompt':
      if (!payload.text) {
        ctx._error = '복사할 텍스트가 없습니다';
        return ctx;
      }
      ctx.copyResult = await copyToClipboard(payload.text);
      break;

    default:
      ctx._error = `지원하지 않는 action입니다: ${action}`;
  }

  return ctx;
}