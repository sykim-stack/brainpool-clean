docs/MODULE_SPEC.md
markdown
# BRAINPOOL 모듈 명세

## 소켓 규격 (Module Contract)

모든 모듈은 아래 규격을 따라야 합니다.

```typescript
type Context = {
  payload: any;          // 실제 데이터
  traceId: string;       // 추적 ID
  _error?: {
    code: string;
    message: string;     // 사용자용 메시지
    retryable: boolean;
  };
};

type Module = (ctx: Context) => Promise<Context>;
입력: 객체 하나 (Context)

출력: 새로운 객체 (원본 수정 금지)

에러: throw 대신 _error 필드 포함

불변성: { ...ctx, payload: { ...ctx.payload, newField } } 형태로 반환

현재 구현된 모듈 (CoreRing)
모듈명	파일	입력 (payload 기준)	출력 추가 필드	설명
detectLanguage	detectLanguage.js	text	sourceLang	정규식으로 한국어/베트남어 판별
translate	translate.js	text, targetLang	translatedText, source	DeepL 호출 → 실패 시 mock fallback
contextFilter	contextFilter.js	-	culturalNote	문화 맥락 태그 (현재 "중립")
emotionFilter	emotionFilter.js	-	emotionScore	감정 점수 (현재 0.3 고정)
새 모듈 작성 템플릿
javascript
// brain-engine/modules/myModule.js
export default async function myModule(ctx) {
  try {
    // 1. 필요한 데이터 추출
    const { someField } = ctx.payload;

    // 2. 비즈니스 로직 수행
    const result = await someLogic(someField);

    // 3. 성공 시 새 Context 반환
    return { ...ctx, payload: { ...ctx.payload, myResult: result } };
  } catch (error) {
    // 4. 실패 시 _error 반환 (throw 금지)
    return {
      ...ctx,
      _error: { code: 'MY_ERROR', message: '처리 실패', retryable: true }
    };
  }
}
모듈 테스트 (권장)
javascript
// test/module.test.js
import myModule from '../brain-engine/modules/myModule';

const ctx = { payload: { someField: 'test' }, traceId: '123' };
const result = await myModule(ctx);
console.assert(!result._error);
console.assert(result.payload.myResult !== undefined);
text

---

## 📁 `docs/LAYER_GUIDE.md`

```markdown
# BRAINPOOL 레이어 개발 가이드

## 레이어의 역할

- **외부 인터페이스**: API 라우트가 호출하는 서비스 단위
- **통합**: 엔진을 실행하고 traceId 생성/관리
- **Stateless**: 레이어 자체는 상태를 가지지 않음 (필요시 context에 저장)

---

## CoreRingLayer 구현 (현재)

```javascript
// brain-engine/layers/CoreRingLayer.js
import { coreRingEngine } from '../engines/index.js';

export class CoreRingLayer {
  async process(text, traceId = crypto.randomUUID()) {
    const ctx = { payload: { text }, traceId };
    const result = await coreRingEngine(ctx);
    return result;
  }
}
process는 입력 텍스트와 선택적 traceId를 받아 엔진 실행

traceId가 없으면 새로 생성

엔진 실행 결과를 그대로 반환

새 레이어 추가 가이드
brain-engine/layers/NewLayer.js 생성

클래스 정의 및 필요한 엔진 import

메서드에서 엔진 실행 및 반환

API 라우트에서 레이어 인스턴스 생성 후 호출

예: CoreChatLayer

javascript
import { chatEngine } from '../engines/chatEngine.js';

export class CoreChatLayer {
  async sendMessage(roomId, text, traceId) {
    const ctx = { payload: { roomId, text }, traceId };
    return await chatEngine(ctx);
  }
}
레이어 간 통신 (향후)
직접 호출 금지 (결합도 증가)

HajunAI 레이어를 중재자로 사용하거나 Event Bus 도입

Phase 1에서는 HajunAI가 모든 레이어 호출을 라우팅

text

---

## 📁 `docs/DEBUGGING.md`

```markdown
# BRAINPOOL 디버깅 및 관측 가이드

## traceId 추적

- 모든 요청은 고유 `traceId`를 가짐 (API 라우트 또는 레이어에서 생성)
- 응답에 `traceId` 포함 → 클라이언트는 이를 로그에 저장 가능
- 서버 콘솔에는 각 요청의 시작/종료 및 에러가 `traceId`와 함께 출력됨

예:
[200] /api/brainpool traceId=abc-123 duration=245ms
자세한 내용은 생략

text

## 일반적인 오류 및 해결

| 오류 메시지 | 원인 | 해결 |
|-------------|------|------|
| `Module not found: Can't resolve '../../brain-engine/...'` | 상대 경로 잘못됨 | `route.js`에서 정확한 경로 지정 (ex: `../../../brain-engine/...`) |
| `DeepL 403` | 인증 방식 오류 또는 키 문제 | `Authorization: DeepL-Auth-Key ${key}` 헤더 사용, 키 유효성 확인 |
| `Missing <html> or <body> tag` | 루트 레이아웃 누락 | `app/layout.js`에 `<html><body>{children}</body></html>` 추가 |
| `Hydration mismatch` | 서버/클라이언트 렌더링 불일치 | 클라이언트 전용 코드는 `'use client'`와 `useEffect`로 분리 |

---

## 로깅 전략 (Phase 0)

- 현재는 `console.log` / `console.warn` + `traceId` 출력
- Supabase `debug_traces` 테이블은 Phase 1에서 도입 (샘플링 + 에러 저장)

---

## 요청 디버깅 예제 (PowerShell)

```powershell
$body = '{"text":"안녕"}'
Invoke-RestMethod -Uri "http://localhost:3000/api/brainpool" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json
응답에 traceId와 _error 필드가 있는지 확인.

text

---

## 📁 `docs/ROADMAP.md`

```markdown
# BRAINPOOL 로드맵

## Phase 0 (완료) – CoreRing 기반 구축

- [x] 모듈-엔진-레이어 아키텍처 설계 및 구현
- [x] 소켓 규격, traceId, 에러 반환 규칙 적용
- [x] DeepL 연동 + mock fallback 번역
- [x] `detectLanguage`, `contextFilter`, `emotionFilter` 기본 모듈
- [x] API 라우트 `/api/brainpool` 및 간단한 UI
- [x] 프로젝트 문서화 (README, docs/)

---

## Phase 1 (진행 중 / 예정) – 안정화 및 확장

- [ ] 감정 분석 고도화 (`emotionFilter`에 `runMindWorld` 통합)
- [ ] 문화 필터 확장 (베트남 방언, 한국어 존댓말)
- [ ] Supabase `debug_traces` 테이블에 traceId 저장 (샘플링)
- [ ] CoreChatLayer 구현 (채팅방, 메시지 상태 관리)
- [ ] JWT 인증 도입 (선택)

---

## Phase 2 (장기) – 고급 기능

- [ ] Event Bus 도입 (레이어 간 느슨한 결합)
- [ ] CoreNullLayer 마이그레이션 (스토리, 포스트 관리)
- [ ] 다언어 지원 (일본어, 중국어)
- [ ] 자동 fallback 전략 (Gemini 번역)
- [ ] 모듈 평판 시스템 (reputation score)

---

## 업데이트 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-05-01 | CoreRing Phase 0 완료, 문서화 |
| 2026-04-30 | DeepL 연동 안정화, mock fallback 추가 |
| 2026-04-29 | brain-engine 구조 확정 |