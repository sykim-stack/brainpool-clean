통합 마스터 문서 v1.1 전체 내용
아래를 그대로 복사해서 새 파일 생성하세요:
Markdown# BRAINPOOL OS 통합 마스터 문서 v1.1

**모든 규칙의 단일 진실 공급원 (Single Source of Truth)**  
작성일: 2026-05-15 | Shark + HajunAI

---

## 1. 프로젝트 철학

BRAINPOOL OS는 **프레임워크에 독립적인** Core Engine입니다.  
모든 구성 요소는 `(ctx) => ctx` 소켓을 통해 연결되며, 예측 가능하고 확장 가능한 시스템을 목표로 합니다.

---

## 2. 불변 계약서 (Core Contracts)

### 함수 형식 (반드시 준수)
```ts
(ctx: BrainpoolContext) => Promise<BrainpoolContext> | BrainpoolContext
Context 구조 (contracts/ctx.md 참조)
TypeScript{
  payload: any,                    // 입력/출력 데이터
  traceId: string,                 // 필수 - 모든 호출 추적
  _error?: {                       // throw 절대 금지
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
  },
  metadata?: Record<string, any>   // 부가 정보
}
핵심 규칙

throw 금지 → _error 필드만 사용
불변성 → 입력 ctx를 mutate하지 않고 새 객체 반환
traceId 연속성 유지 (모든 레이어 통과)
Side-effect는 Connector에서만 허용
모든 모듈은 순수 함수 지향


3. 디렉토리 계층 구조

contracts/ → 계약서, 타입, 유틸 (ctx, createCtx 등)
connectors/ → 외부 시스템 단일 접근점 (Supabase, DeepL, Git 등)
engines/ → 모듈 조합 로직 (translation, emotion 등)
hajun/ → 라우터 (route만 담당, 판단 로직 없음)
doc/ → 모든 문서
schemas/ → DB 스키마, 타입


4. 개발 규칙

모든 신규 모듈은 (ctx) => ctx 형태로 작성
Supabase 연결은 createSupabaseConnector(ctx) 패턴 사용
Git 연동 시 traceId 반드시 전달
PowerShell 명령어 기준으로 예시 제공
에러 발생 시 _error 채우고 downstream으로 전달 (retryable 판단)


5. 표준 에러 코드 (확장 예정)

ERR_INVALID_CTX
ERR_TRACEID_MISSING
ERR_SUPABASE_CONNECT
ERR_DEEPL_FAILED
ERR_ENGINE_FAILED


이 문서는 BRAINPOOL OS의 최상위 문서입니다.
모든 개발자(본인 포함)는 작업 전에 반드시 이 문서를 먼저 확인해야 합니다.

버전 히스토리

v1.1 (2026-05-15): Shark 모드 적용, PowerShell 반영, 계층 구조 명확화
v1.0 (초안)

다음 업데이트 예정: Invite Code 정책, Connector 계약서 상세화