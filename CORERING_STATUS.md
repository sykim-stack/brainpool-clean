# CORERING_STATUS.md
_최종 업데이트: 2026-11-10_

## 완료된 기능

### CoreRing (번역)
- [x] 한국어 ↔ 베트남어 번역 (DeepL)
- [x] 번역 캐시 (tb_trans_logs)
- [x] 번역기 모드 (방 없이 번역)
- [x] 양방향 감지 → 채팅방 유도 배너
- [x] Mock/[Mock] 캐시 저장·히트 차단 (P0-5, #29)
- [x] Gemini 3.x thinkingBudget 제거 → riskScore 경로 복구 (#32/#33/#34)

### CoreChat (채팅)
- [x] 실시간 채팅 (2초 폴링)
- [x] 방 생성/참여/삭제
- [x] 공개방/비밀방 구분
- [x] 방 생성 → 공유 모달
- [x] 푸시 알림 (Web Push)
- [x] 음성 메시지 + 🔊 재생
- [x] 메시지 삭제 (휴지통)
- [x] 방 삭제 confirm (P0-3, #30)
- [x] 카카오 인앱 → 다른 브라우저 안내 (ShareRoomModal + kakaoNotice 스타일, 2026-11-10)
- [x] 공유 URL = `window.location.origin` (하드코딩 corering.vercel.app 제거)

### CorePhrase (단어장)
- [x] 단어 저장/조회/삭제
- [x] 북마크/학습상태
- [x] 플립카드 학습 모드
- [x] 알아요/몰라요 → review_at 설정
- [x] 학습 통계 (전체/완료/복습/연속🔥)
- [x] 메모/번역 수정 기능
- [x] 리스트 스피커 인라인 정렬 (단어 옆, 2026-11-10)

### WordModal
- [x] 가운데 정렬 모달 (사이드 패널 → 센터, 2026-11-10)

### 음성 DB
- [x] 🎤 채팅 음성 녹음
- [x] Storage 저장
- [x] WordModal 발음 녹음 ("친구에게 발음 알려주세요")
- [x] audio_contributions DB 저장
- [x] 🔊 발음 듣기

### KIIP
- [x] Stage 1 문제·세션 (Phase 2 검증)
- [x] Stage 2/3/4 문제 SQL **레포에 존재** (`supabase/migrations/20261014_kiip_stage{2,3,4}_batch1.sql`, `20261016_kiip_stages2_4_batch2.sql`, sessions)
- [ ] Stage 2–4 **라이브 DB 적용 여부** 확인 (Dashboard migration history / `SELECT stage, count(*) FROM kiip_questions GROUP BY 1`)

### 인프라
- [x] PWA 설치
- [x] RLS 보안 설정
- [x] API 8개로 통합
- [x] messages 테이블 통합

## 미완성/개선 필요

### 지금 바로 (사람 + Supabase 필요)
- [ ] **tb_trans_logs legacy [Mock] 행 삭제** — `scripts/cleanup-mock-trans-logs.sql`
  1. Supabase SQL Editor에서 SELECT 미리보기
  2. count 확인 후 DELETE 주석 해제 실행
- [ ] KIIP stage 2–4 migration이 production에 적용됐는지 확인 (위 SELECT)

### 우선순위 높음 (크레딧/기기)
- [ ] 음성 STT → 번역 (OpenAI Whisper 크레딧 필요)
- [ ] iOS 음성 재생 호환 문제

### 우선순위 중간
- [ ] 모바일 음성 녹음 불안정
- [ ] audio_contributions 기여 횟수 표시
- [ ] WordModal 발음 버튼 UX 개선
- [ ] Gemini 분석 이중 경로 통합 (emotion engine vs lib/analysis)

### 나중에
- [ ] tp_translations 데이터 추가
- [ ] 복습 알림 (브라우저 푸시)
- [ ] 학습 통계 상세화
- [ ] 관계 설정 (C 방식) - Phase 1

## 코어널 연동 포인트
messages.relations → parent_id로 댓글 연결 가능
tp_translations    → 방언 사전 공유
audio_contributions → 원어민 발음 DB 공유
tb_trans_logs      → 번역 이력 공유

## 실사용 현황
번역로그: 1200+ 건
단어장: 사용 중
음성DB: 수집 시작
사용자: 아내(베트남), 숭실대 유학생

## 2026-11-01 — Gemini risk bar recovery

- **Cause:** `thinkingConfig: { thinkingBudget: 0 }` is Gemini **2.5-only**; on `gemini-3.8-flash` API rejects → fallback `riskScore: 0` → WordModal hides ⚠ section.
- **Fix:**
  - #32 `lib/analysis/providers/gemini.ts`
  - #33 `brain-engine/engines/emotion|dialect` (live path)
  - #34 analysis prompt criteria aligned with emotion
- **Ops:** After DeepL outages, run `scripts/cleanup-mock-trans-logs.sql` if mock rows were written before P0-5.

## 2026-11-10 — UI / share polish

- WordModal center overlay (not right rail)
- CorePhrase list speak button inline with word
- ShareRoomModal: kakaoNotice CSS + stronger in-app browser hint; share URL uses current origin
