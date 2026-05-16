# CHANGELOG - brainpool-clean

## [Unreleased]
### Added
- README.md PowerShell 중심으로 재정리
- brainpool-os 통합 마스터 문서 링크 연동
- Shark 모드 개발 규칙 문서화

### Changed
- 빠른 시작 가이드 전체 PowerShell로 통일
- docs/ 문서 구조 정리 및 brainpool-os 참조 강화
- 프로젝트 구조 설명 간소화

### Fixed
- README.md 내 경로 및 명령어 불일치 수정

---

## [v3.0] - 2026-05-15
### Added
- CoreRingEngine 완전 모듈화 (modules / engines / layers)
- `(ctx) => ctx` 패턴 전면 적용
- DeepL Connector + Mock Fallback 구현
- Supabase Connector 준비
- Git Connector 연동 기반 마련

### Changed
- Next.js App Router 기반 API 구조 (`/api/brainpool`)
- throw 금지 + `_error` 필드 강제 적용
- traceId 연속성 강화

### Removed
- 불필요한 중복 문서 정리

---

## [v2.0] - 2026-04
### Added
- Next.js 15 기반 프로젝트 초기 구조
- 기본 번역 및 감정 분석 API
- Hajun 라우터 초기 버전

---

**이 CHANGELOG는 brainpool-clean 구현체 중심**으로 관리합니다.  
CoreRing 규칙 변경 등은 `brainpool-os` CHANGELOG를 함께 확인하세요.

**작성일**: 2026-05-15 | Shark 모드