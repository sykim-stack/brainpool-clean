# BRAINPOOL OS 아키텍처

**버전**: v3.0 | **작성일**: 2026-05-15  
**참조**: [통합 마스터 문서](https://github.com/sykim-stack/brainpool-os/blob/main/doc/BRAINPOOL-OS-통합-마스터-문서.md)

---

## 1. 전체 목표

`brainpool-clean`은 **BRAINPOOL OS CoreRing**을 Next.js에서 구현한 **참조 구현체**입니다.  
모든 컴포넌트는 `(ctx) => ctx` 계약을 엄격히 따릅니다.

---

## 2. 계층 구조
Client / API Request
↓
Hajun Router (app/api/brainpool/route.ts)
↓
CoreRingLayer
↓
CoreRingEngine
↓
├── Translation Module → DeepL Connector
├── Emotion Module
├── Culture Filter Module
└── ...
↓
Supabase Connector / Git Connector
text---

## 3. 주요 디렉토리 역할

| 디렉토리            | 역할                              | 핵심 파일 예시 |
|---------------------|-----------------------------------|----------------|
| `brain-engine/modules` | 단일 기능 모듈                   | translate.ts, emotion.ts |
| `brain-engine/engines` | 모듈 조합 엔진                    | coreRingEngine.ts |
| `brain-engine/layers`  | stateless 파이프라인              | coreRingLayer.ts |
| `app/api/brainpool`    | Next.js API 엔트리포인트          | route.ts |
| `connectors`           | 외부 서비스 연결                  | supabase.ts, deepl.ts |
| `hajun`                | 라우팅 및 요청 검증               | router.ts |

---

## 4. Context 흐름 원칙

- **traceId**는 요청 시작부터 끝까지 유지
- **_error** 존재 시 downstream 모듈에서도 즉시 처리
- Payload는 불변성 유지 (새 객체 반환)
- 모든 함수는 순수 함수 지향

---

## 5. 기술 스택 및 환경

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Supabase (예정)
- DeepL API + Mock Fallback
- PowerShell 중심 개발 환경

---

**이 문서는 brainpool-os 마스터 문서와 함께 최신 상태로 유지**해야 합니다.