 docs/API.md
markdown
# BRAINPOOL API 명세

## 기본 정보

- **Base URL**: `http://localhost:3000/api`
- **인증**: Phase 0에서는 없음 (향후 JWT 도입 예정)
- **공통 헤더** (선택):
  - `X-Session-Id`: 클라이언트 세션 식별자 (localStorage에서 관리)

---

## 엔드포인트

### `POST /brainpool`

CoreRing 번역 + 감정/문화 분석을 수행합니다.

#### 요청

```json
{
  "text": "번역할 문장"
}
응답 (성공)
json
{
  "payload": {
    "text": "안녕하세요",
    "sourceLang": "ko",
    "translatedText": "Xin chào",
    "source": "deepl",          // "deepl" | "mock"
    "culturalNote": "중립",
    "emotionScore": 0.3
  },
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "_error": null
}
응답 (모듈 내부 오류)
json
{
  "payload": { ... },
  "traceId": "...",
  "_error": {
    "code": "TRANSLATE_FAIL",
    "message": "번역 실패",
    "retryable": true
  }
}
HTTP 상태 코드
200: 성공 (내부 _error가 있어도 HTTP는 200)

500: 서버 처리 불가 (예: 라우트 자체 오류)

이후 추가될 엔드포인트 (예정)
POST /chat – CoreChatLayer 메시지 전송

GET /debug/traces/{traceId} – 디버그 로그 조회

text

---

## 📁 `docs/ARCHITECTURE.md`

```markdown
# BRAINPOOL 아키텍처 개요

## 계층 구조 (Layered Architecture)
┌─────────────────────────────────────────┐
│ UI Layer │ (Next.js 페이지, React 컴포넌트)
└─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│ API Layer │ (app/api/*/route.js)
└─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│ Layer (stateless) │ (예: CoreRingLayer)
└─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│ Engine │ (모듈 조합기, 예: coreRingEngine)
└─────────────────────────────────────────┘
│
▼
┌─────────────────────────────────────────┐
│ Modules │ (단일 기능 함수)
└─────────────────────────────────────────┘

text

- **모듈**: 가장 작은 단위, `(ctx) => ctx`, 불변, 에러는 `_error` 반환
- **엔진**: 모듈들을 순차/병렬로 실행 (runPipeline)
- **레이어**: 엔진을 감싸는 서비스 퍼사드 (stateless, traceId 생성)
- **API**: 레이어를 HTTP로 노출
- **UI**: API 호출 및 렌더링 전용 (비즈니스 로직 없음)

---

## 데이터 흐름 (CoreRing 예시)

1. 사용자가 `POST /api/brainpool` 에 JSON 요청
2. API 라우트에서 `CoreRingLayer.process(text)` 호출
3. 레이어가 traceId 생성, `ctx = { payload: { text }, traceId }`
4. `coreRingEngine(ctx)` 실행 → 내부 `runPipeline`이 모듈 순차 호출
   - `detectLanguage`: sourceLang 추가
   - `translate`: translatedText + source 추가
   - `contextFilter`: culturalNote 추가
   - `emotionFilter`: emotionScore 추가
5. 최종 `ctx`가 응답으로 변환되어 반환

---

## 핵심 원칙

- **Stateless**: 레이어/엔진/모듈은 상태를 가지지 않음 (필요시 클라이언트가 sessionId 제공)
- **불변성**: 각 모듈은 입력 객체를 수정하지 않고 새 객체 반환
- **에러는 반환**: `throw` 금지, `_error` 필드로 전파
- **traceId 의무**: 모든 요청은 고유 traceId를 가지며 로그 추적에 사용