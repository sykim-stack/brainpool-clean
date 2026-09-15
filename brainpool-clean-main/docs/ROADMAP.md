# ROADMAP - BRAINPOOL OS

**버전**: v3.3 | **작성일**: 2026-07-15 | **검토**: Manus AI

---

## 🎯 현재 상태 (v3.3)

- **클로5 (코어링)**: CoreRing 모듈화 완료 (`modules → engines → layers`), `(ctx) => ctx` 계약서 전면 적용, DeepL Connector + Mock Fallback 구현.
- **클로2 (하준아이)**: 문서 체계화 (통합 마스터 문서 중심), PowerShell 가이드 통합.
- **클로5 (코어링)**: **ADR-002 (messages.translations jsonb 정식화 및 messages.relations.tb_trans_log_id 연결) 완료**.

**강점**: 철학 일관성, 계층 구조, 확장성, Connector 중심 설계, 데이터 일관성 강화, 명확한 에이전트 역할 분담.

---

## 🚀 Phase별 로드맵 (재정렬 완료)

### Phase 4 (진행중) - 문서 & Observability 기반
- [x] **클로2 (하준아이)**: 통합 마스터 문서 + docs 체계화
- [x] **클로2 (하준아이)**: CHANGELOG & ROADMAP 유지 프로세스
- [x] **클로5 (코어링)**: ADR-002 (messages.translations jsonb 정식화 및 messages.relations.tb_trans_log_id 연결)
- **[신규 최우선] 클로5 (코어링)**: debug_traces 테이블 설계 및 Connector 구현
- **[신규] 클로5 (코어링)**: request replay 시스템 + ctx snapshot 저장

### Phase 5 (단기 - 2주 내, Observability 최우선)

**최우선 순위**
1. **클로5 (코어링)**: **debug_traces + Replay System**  
   - ctx 전체 스냅샷 저장 (traceId 기반)
   - pipeline 재실행 기능
   - runtime observability 강화

2. **클로5 (코어링)**: **CoreChatLayer** 구현  
   - 실제 사용자 채팅 흐름 파이프라인

3. **클로5 (코어링)**: **Supabase Connector 완성** (`createSupabaseConnector(ctx)`)
4. **클로3 (코어널)**: invite_code 6자 생성 모듈 + Supabase 연동
5. **클로5 (코어링)**: traceId 기반 logging & visualization 준비

### Phase 6 (중기 - 1개월 내)

- **클로5 (코어링)**: Multi-LLM Fallback 강화 (Gemini, Claude 등)
- **클로5 (코어링)**: **LLM Response Normalization Layer** 신규 추가  
  → `ctx.ai.text`, `ctx.ai.tokens`, `ctx.ai.model`, `ctx.ai.finishReason` 표준화
- **클로2 (하준아이)**: Hajun Router 고도화 (동적 모듈 로딩)
- **클로5 (코어링)**: Vitest 기반 테스트 확대 (특히 replay 테스트)
- **클로5 (코어링)**: Git Connector 완성

### Phase 7 (장기)

- **클로1 (총괄)**: brainpool-os npm 패키지 배포
- **클로1 (총괄)**: Multi-Runtime 지원 (Edge, Node, Bun 등)
- **클로2 (하준아이)**: BRAINPOOL OS Dashboard (pipeline visualization)
- **클로1 (총괄)**: Python / Rust 포팅 검토
- **클로3 (코어널)**: 언어 자산 플랫폼화 (누적 기억, 관계, 사용자 흐름)

---

## 🔍 Observability 전략 (가장 중요한 변경점)

**현재 가장 위험한 부분** = "기능 추가 속도 > 검증 속도"

**필수 전략**:
- ctx snapshot 저장 → 언제든 replay 가능
- 모든 Connector는 traceId + debug_traces 로깅 의무화
- throw-less pipeline + error recovery 강화
- pipeline visualization 도구 준비

**왜 중요한가?**  
`(ctx) => ctx` 구조는 **ctx만 있으면 전체 흐름을 완전히 재현**할 수 있는 강력한 자산입니다. 이를 최대한 활용해야 합니다.

---

**우선순위 재정렬 기준**:
1. Observability (debug_traces + replay) - **클로5 (코어링)**
2. 실제 사용자 흐름 (CoreChatLayer) - **클로5 (코어링)**
3. 인프라 안정화 (Supabase Connector) - **클로5 (코어링)**
4. 기능 추가 (invite_code 등) - **클로3 (코어널)**

---

**참조**
- [통합 마스터 문서](/home/ubuntu/brainpool/brainpool-os/doc/directives/Master_Prompt_v2.0.md)
- [에이전트 지시서](/home/ubuntu/brainpool/brainpool-os/doc/directives/Agents_Directive.md)
- [CHANGELOG](CHANGELOG.md)
- [DEBUGGING](DEBUGGING.md)

**이 ROADMAP은 매주 검토**합니다.
