# BRAINPOOL OS 통합 마스터 문서 v1.1

**프로젝트 핵심 원칙과 규칙을 한 곳에 모은 문서**  
작성일: 2026-05-15 | Shark + HajunAI

---

## 1. 프로젝트 철학

BRAINPOOL OS는 **확장 가능하고 예측 가능한** 언어·감정·문화 처리 엔진입니다.  
모든 것은 `(ctx) => ctx` 소켓으로 연결됩니다.

---

## 2. 불변 규칙 (반드시 준수)

### 함수 형식
```ts
(ctx: BrainpoolContext) => BrainpoolContext
Context 구조
TypeScript{
  payload: any,           // 입력 및 출력 데이터
  traceId: string,        // 필수 (모든 호출에 존재)
  _error?: {              // throw 절대 금지
    code: string;
    message: string;
    details?: any;
  },
  metadata?: Record<string, any>
}
엄격 준수 사항

throw 금지 → _error 필드만 사용
불변성 → 입력 ctx를 직접 수정하지 말고 새 객체 반환
traceId 연속성 유지 (모든 레이어·엔진·모듈 통과)
순수 함수 지향 (side-effect 최소화)
에러 발생 시 _error만 채우고 downstream으로 전달


3. 계층 구조 (Layered Architecture)

Modules → 단일 책임 (번역, 감정분석, 문화필터 등)
Engines → 모듈 조합 (CoreRingEngine 등)
Layers → stateless 파이프라인 처리 (CoreChatLayer, CoreRingLayer 등)


4. 개발 규칙

모든 신규 기능은 (ctx) => ctx 형태로 구현
Supabase 연동 시 createSupabaseConnector(ctx) 패턴 사용
Git 커넥터 연동 시 traceId 함께 전달
PowerShell 명령어 기준으로 README 및 예시 작성


5. 에러 코드 표준 (예정)

ERR_DEEPL_FAILED
ERR_INVALID_CTX
ERR_TRACEID_MISSING
ERR_SUPABASE_CONNECT


이 문서는 프로젝트의 최고 우선순위 문서입니다.
모든 개발자는 이 문서를 먼저 읽고 작업해야 합니다.

버전 관리: v1.1 (2026-05-15)
다음 업데이트 예정: Supabase Connector 규격, Invite Code 정책