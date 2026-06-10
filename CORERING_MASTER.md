# CORERING_MASTER.md

## 프로젝트 개요
- **프로젝트명**: CoreRing / CoreChat (BRAINPOOL OS의 번역/채팅 모듈)
- **배포**: https://corering.vercel.app
- **저장소**: C:\brainpool-clean\brainpool-clean
- **DB**: Supabase (Jena-Voca-01)
- **프레임워크**: Next.js 16.2.4 (Turbopack)

## 핵심 역할
CoreRing  → 언어 번역 (한국어 ↔ 베트남어)
CoreChat  → 실시간 채팅 + 푸시 알림
CorePhrase → 단어장 + 학습 모드 (플립카드)

## 기술 스택
번역: DeepL API
캐시: Supabase (tb_trans_logs)
STT: Web Speech API (vi-VN)
음성저장: Supabase Storage (voice-recordings)
푸시: Web Push API + VAPID
PWA: manifest.json + sw.js

## API 구조 (8개)
/api/brainpool      → CoreRing 번역 (방 없을 때)
/api/chat           → CoreChat 통합 (send|poll|create|join)
/api/chat/rooms     → 방 목록 조회
/api/chat/rooms/[id]→ 방 상세/삭제/메시지삭제
/api/phrase         → 단어장 CRUD (구 corenull)
/api/push/send      → 푸시 알림 발송
/api/push/subscribe → 푸시 구독 저장
/api/voice/upload   → 음성 파일 업로드

## 핵심 파일
app/page.tsx                    → 메인 UI
components/ChatBubble.tsx       → 말풍선
components/ChatInput.tsx        → 입력창 + 🎤 녹음
components/WordModal.tsx        → 단어 카드 + 발음 녹음
components/CorePhrase.tsx       → 단어장 + 학습 모드
components/ShareRoomModal.tsx   → 방 공유 모달
brain-engine/layers/CoreNullLayer.js → 단어장 레이어
brain-engine/engines/chat/message.js → 채팅 메시지
brain-engine/engines/chat/room.js    → 채팅방
brain-engine/engines/translation/    → 번역 엔진

## DB 테이블
messages            → 채팅 메시지 (통합)
chat_rooms          → 채팅방 (is_public 컬럼)
tb_trans_logs       → 번역 로그 (캐시)
tp_translations     → 방언 사전 (5384개)
user_vocabulary     → 사용자 단어장
audio_contributions → 원어민 발음 DB
push_subscriptions  → 푸시 구독

## 메시지 표준 구조
```typescript
interface Message {
  messageId: string
  original:  string   // 원문
  translated: string  // 번역
  sourceLang: string  // ko | vi
  targetLang: string
  emotion:    string
  riskScore:  number
  timestamp:  string
  userId:     string
  audioUrl?:  string  // 음성 메시지
}
```

## 환경변수
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEEPL_API_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_EMAIL
NEXT_PUBLIC_APP_URL
OPENAI_API_KEY (Whisper STT - 크레딧 필요)

## 핵심 설계 원칙
- 모든 API는 action 기반 통합 구조
- 메시지는 messages 테이블 단일화
- 번역 결과는 tb_trans_logs에 캐시
- deviceId 기반 식별 (로그인 없음)
- ctx => ctx 계약 (throw 금지)
