# DEBUGGING GUIDE - BRAINPOOL OS

**버전**: v3.0 | **작성일**: 2026-05-15

---

## 1. 디버깅 핵심 원칙

- `traceId`를 끝까지 유지하여 모든 흐름 추적
- `throw` 대신 `_error` 필드만 사용
- `console.log` 대신 `debugLog` 유틸 사용 (traceId 자동 포함)

---

## 2. traceId 생성 및 사용

```ts
import { createTraceId } from '@/brain-engine/utils/trace';

const ctx = {
  payload: { ... },
  traceId: createTraceId()   // bp-20260515-xxx-xxxx 형식
};

3. 디버깅 유틸 예시
TypeScriptexport const debugLog = (ctx: BrainpoolContext, message: string, data?: any) => {
  console.log(`[DEBUG][${ctx.traceId}] ${message}`, data ? data : '');
  
  // Supabase debug_traces 테이블에 기록 (선택)
};

4. 에러 발생 시 대응 패턴
TypeScriptconst result = someModule(ctx);

if (result._error) {
  debugLog(ctx, `Error occurred: ${result._error.code}`, result._error);
  
  // retryable이면 재시도 로직 실행
  if (result._error.retryable) {
    // retry...
  }
  
  return result;   // downstream으로 전달
}

5. PowerShell + VS Code 디버깅 팁
PowerShell# 1. 개발 서버 실행
npm run dev

# 2. 별도 터미널에서 테스트
Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/brainpool" `
  -ContentType "application/json" `
  -Body (@{ text = "테스트"; operation = "full" } | ConvertTo-Json)
VS Code 추천 설정

Breakpoint를 (ctx) => ctx 함수 진입부에 걸기
Watch에 ctx.traceId, ctx._error 추가


6. Supabase 연동 디버깅

supabase/debug_traces 테이블 생성 예정
모든 _error와 중요한 metadata 자동 기록


참조 문서

통합 마스터 문서
아키텍처