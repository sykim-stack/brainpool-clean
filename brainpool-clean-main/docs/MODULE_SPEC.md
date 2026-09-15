# MODULE SPEC - BRAINPOOL OS

**버전**: v3.0 | **작성일**: 2026-05-15

---

## 1. 모듈 개발 규칙

모든 모듈은 **brain-engine/modules/** 에 위치하며 다음 규칙을 반드시 준수합니다.

- 파일명: `kebab-case` + 기능명 (`translate.ts`, `emotion-analyzer.ts`)
- 함수명: `createXXXModule(ctx) => Module`
- 실행 형식: `(ctx) => ctx`

---

## 2. 주요 모듈 목록

| 모듈명                    | 경로                              | 역할 | 상태 | 비고 |
|---------------------------|-----------------------------------|------|------|------|
| Translation Module        | modules/translate.ts             | DeepL + Mock Fallback | ✅ 완료 | retryable 지원 |
| Emotion Analyzer          | modules/emotion.ts               | 감정 분석 | ✅ 완료 | 다국어 지원 |
| Culture Filter            | modules/culture-filter.ts        | 문화적 맥락 조정 | 🔄 진행중 | - |
| Invite Code Generator     | modules/invite-code.ts           | 6자 invite code 생성 | 🔄 예정 | Supabase 연동 |
| Git Connector             | connectors/git.ts                | GitHub 연동 | 🔄 예정 | traceId 전달 |
| Supabase Connector        | connectors/supabase.ts           | DB 접근 | 🔄 예정 | ctx 기반 |

---

## 3. 모듈 기본 템플릿

```ts
export const createTranslateModule = () => {
  return (ctx: BrainpoolContext): BrainpoolContext => {
    const { payload, traceId } = ctx;

    if (!payload?.text) {
      return {
        ...ctx,
        _error: { code: "ERR_INVALID_PAYLOAD", message: "text가 필요합니다" }
      };
    }

    // ... 실제 로직 ...

    return {
      ...ctx,
      payload: {
        ...payload,
        translatedText: "...",
        detectedLang: "..."
      }
    };
  };
};

4. 모듈 등록 방식 (CoreRingEngine)
TypeScriptconst coreRingEngine = createCoreRingEngine({
  modules: {
    translate: createTranslateModule(),
    emotion: createEmotionModule(),
    // ...
  }
});

참조: 통합 마스터 문서