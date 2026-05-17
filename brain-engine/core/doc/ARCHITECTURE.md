# BRAINPOOL OS 아키텍처 개요

**버전**: v3.0 (2026-05-15)  
**작성자**: Shark + HajunAI

---

## 1. 전체 철학

BRAINPOOL OS는 **"모든 것을 (ctx) => ctx 소켓으로 연결"** 하는 것을 핵심으로 합니다.  
프레임워크 독립적이며, 예측 가능하고 확장하기 쉬운 아키텍처를 목표로 합니다.

---

## 2. 계층 구조 (Layered Architecture)

```mermaid
graph TD
    A[Client / API Route] --> B[Hajun Router]
    B --> C[CoreRingEngine]
    C --> D[Engines]
    D --> E[Modules]
    E --> F[Connectors]
    
    subgraph "Core Layer"
    C
    D
    E
    end
    
    subgraph "External"
    F[Supabase, DeepL, Git, ...]
    end
계층별 역할









































계층위치책임특징Hajunhajun/요청 라우팅만 담당판단 로직 거의 없음Layerslayers/stateless 파이프라인 처리CoreChatLayer, CoreRingLayer 등Enginesengines/여러 Modules 조합CoreRingEngineModulesmodules/단일 책임 (번역, 감정분석 등)재사용성 최고Connectorsconnectors/외부 시스템 단일 접근점Supabase, DeepL, Git

3. Context 흐름 (ctx)
TypeScript// 모든 호출의 기본 형태
const result = someModule(ctx);
const result2 = someEngine(result);

payload: 데이터 전달
traceId: 끝까지 유지 (로깅/디버깅 핵심)
_error: 에러 발생 시 throw 대신 사용
불변성: 항상 새 객체 반환


4. 주요 흐름 예시

API 요청 → Hajun Router
CoreRingLayer 실행
CoreRingEngine → Translation Module → DeepL Connector
결과 → _error 체크 → Response


5. 기술 스택

언어: TypeScript
런타임: Node.js / Next.js 15 (App Router)
DB: Supabase (PostgreSQL)
번역: DeepL + Mock Fallback
스타일: (ctx) => ctx, 불변성, throw 금지


이 문서는 brainpool-os 통합 마스터 문서와 함께 참조하세요.
다음 업데이트 예정: Mermaid 다이어그램 추가, Sequence Diagram, Data Flow Diagram