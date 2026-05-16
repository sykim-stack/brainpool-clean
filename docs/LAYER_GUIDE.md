# LAYER GUIDE - BRAINPOOL OS

**버전**: v3.0 | **작성일**: 2026-05-15

---

## 1. Layer란?

**Layer**는 `brain-engine/layers/` 에 위치하며, **stateless 파이프라인** 처리를 담당합니다.  
여러 Engine과 Module을 조합해서 하나의 처리 흐름을 만듭니다.

**특징**
- `(ctx) => ctx` 엄격 준수
- 순서가 중요 (파이프라인)
- 재사용성과 테스트 용이성 극대화

---

## 2. 주요 Layer

| Layer명              | 경로                        | 역할 | 상태 |
|----------------------|-----------------------------|------|------|
| CoreRingLayer        | layers/coreRingLayer.ts    | CoreRing 전체 실행 | ✅ 완료 |
| CoreChatLayer        | layers/coreChatLayer.ts    | 채팅 특화 파이프라인 | 🔄 예정 |
| ValidationLayer      | layers/validationLayer.ts  | 입력 검증 | 🔄 예정 |

---

## 3. Layer 기본 구조

```ts
export const createCoreRingLayer = (engine: CoreRingEngine) => {
  return async (ctx: BrainpoolContext): Promise<BrainpoolContext> => {
    const startTime = Date.now();

    // 1. 사전 검증
    ctx = validationStep(ctx);

    // 2. Engine 실행
    ctx = await engine(ctx);

    // 3. 후처리
    ctx = postProcessing(ctx);

    // 4. 메타데이터 추가
    return {
      ...ctx,
      metadata: {
        ...ctx.metadata,
        processingTimeMs: Date.now() - startTime,
        layer: "CoreRingLayer"
      }
    };
  };
};

4. Layer 개발 규칙

불변성 철저히 지키기 (...ctx 스프레드 사용)
traceId 반드시 유지
_error 체크 후 early return 패턴 권장
각 Layer는 독립적으로 테스트 가능해야 함
async/await 적극 활용 (Connector 호출 시)


5. Layer 등록 예시 (route.ts)
TypeScriptconst coreRingLayer = createCoreRingLayer(coreRingEngine);

export async function POST(request: Request) {
  let ctx = createCtx(await request.json());
  ctx = await coreRingLayer(ctx);
  return Response.json(ctx);
}

참조 문서

통합 마스터 문서
아키텍처
MODULE_SPEC