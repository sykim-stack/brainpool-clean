# CORERING_STATUS.md
_최종 업데이트: 2026-06-10_

## 완료된 기능

### CoreRing (번역)
- [x] 한국어 ↔ 베트남어 번역 (DeepL)
- [x] 번역 캐시 (tb_trans_logs)
- [x] 번역기 모드 (방 없이 번역)
- [x] 양방향 감지 → 채팅방 유도 배너

### CoreChat (채팅)
- [x] 실시간 채팅 (2초 폴링)
- [x] 방 생성/참여/삭제
- [x] 공개방/비밀방 구분
- [x] 방 생성 → 공유 모달
- [x] 푸시 알림 (Web Push)
- [x] 음성 메시지 + 🔊 재생
- [x] 메시지 삭제 (휴지통)

### CorePhrase (단어장)
- [x] 단어 저장/조회/삭제
- [x] 북마크/학습상태
- [x] 플립카드 학습 모드
- [x] 알아요/몰라요 → review_at 설정
- [x] 학습 통계 (전체/완료/복습/연속🔥)
- [x] 메모/번역 수정 기능

### 음성 DB
- [x] 🎤 채팅 음성 녹음
- [x] Storage 저장
- [x] WordModal 발음 녹음 ("친구에게 발음 알려주세요")
- [x] audio_contributions DB 저장
- [x] 🔊 발음 듣기

### 인프라
- [x] PWA 설치
- [x] RLS 보안 설정
- [x] API 8개로 통합
- [x] messages 테이블 통합

## 미완성/개선 필요

### 우선순위 높음
- [ ] 음성 STT → 번역 (OpenAI Whisper 크레딧 필요)
- [ ] iOS 음성 재생 호환 문제
- [ ] 카카오 공유 → 크롬으로 열기 안내

### 우선순위 중간
- [ ] 모바일 음성 녹음 불안정
- [ ] audio_contributions 기여 횟수 표시
- [ ] WordModal 발음 버튼 UX 개선

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
