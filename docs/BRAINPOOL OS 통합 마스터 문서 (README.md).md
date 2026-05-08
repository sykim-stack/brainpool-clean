## 🧠 BRAINPOOL OS 통합 마스터 문서 (README.md)

이 문서 하나만 읽으면, 어떤 AI든 새로운 샤크든 즉시 프로젝트의 모든 것을 이해하고 작업에 들어갈 수 있도록 설계합니다.

---

# 🧠 BRAINPOOL OS — 통합 마스터 문서 v1.0

> **"언어 장벽 없는 대화를 위한 살아있는 생태계"**  
> 한국어-베트남어 실시간 번역 채팅 · 시니어 친화 · 무로그인 개인화 · 학습 자산 축적

---

## 1. 프로젝트 정체성

**BRAINPOOL OS**는 단순한 번역기가 아닙니다.  
번역 결과를 **학습 자산**으로 축적하고, 사용자가 의식하지 않는 사이에 언어 데이터가 쌓이며,  
로그인 없이 디바이스 ID만으로 개인화되는 **언어 생태계 플랫폼**입니다.

### 🎯 핵심 역발상 (우리가 세상과 반대로 생각하는 것들)

| 세상의 방식 | BRAINPOOL의 방식 |
|------------|-----------------|
| 원본 → 번역 | **번역(크게) → 원본(작게)** |
| 로그인 필수 | **무로그인 (device_id)** |
| 번역은 1회성 | **모든 번역 = 영구 학습 자산** |
| 버튼은 잘 보이게 | **버튼은 숨기고 우연히 발견하게** |
| AI 번역 | **DB 캐싱 → AI fallback** |
| 기능 많이 보여주기 | **숨은 그림 찾기 UX** |

---

## 2. 기술 아키텍처

```
사용자 브라우저 (Next.js 15+)
        │
        ▼
API 라우트 (/api/brainpool, /api/chat/*)
        │
        ▼
CoreChatLayer (레이어 조합기)
   ├── ChatRoomLayer     → Supabase chat_rooms
   ├── ChatMessageLayer  → Supabase chat_messages
   ├── ChatDBCacheLayer  → tb_trans_logs (번역 캐싱)
   └── CoreRing 호출     → 번역 + 감정/문화 분석
        │
        ▼
CoreRing 엔진 (stateless 조합기)
   ├── detectLanguage
   ├── translate (DeepL API + DB 캐싱)
   ├── emotionFilter
   └── cultureFilter
        │
        ▼
Supabase DB
   ├── chat_rooms, chat_messages, chat_participants
   ├── tb_trans_logs (번역 로그/캐싱)
   ├── tp_translations (방언 사전)
   └── tp_conflicts (문화 충돌)
```

---

## 3. 현재 프로젝트 상태 (2026-05-03 기준)

### ✅ 정상 작동
- CoreRing 번역 (한국어↔베트남어, DeepL API)
- 채팅 메시지 전송·폴링
- Supabase 연동 (모든 테이블)
- 번역 방향 자동 결정 (sourceLang → targetLang)
- 채팅방 목록·생성 (초대 코드 자동 생성)
- 클립보드 자동 복사

### ❌ 미완료 / 개선 필요
- 베트남어→한글 번역 결과 UI 매핑 정밀 조정
- CoreRing UI (노안 친화적 리디자인)
- 방 생성 직후 UI 전환 간헐적 지연
- CoreNull 커뮤니티 연동

---

## 4. 핵심 자산 (반드시 알아야 할 것들)

### 🛡️ 실패 백신 v1
과거의 실패를 반복하지 않기 위한 예방접종 문서.
- **UTF8-ALL**: 모든 구간 UTF-8 강제
- **UUID-TYPE**: DB 타입 불일치 방지
- **LANG-MAP**: 언어 감지·번역 매핑 오류 방지
- **BUBBLE-FIX**: 말풍선 역방향 정렬 혼란 방지
- **VAR-DUP**: 변수 중복 선언 방지
- **COPY-UX**: 복사 기능 UX 실패 방지

### 🦈 샤크 협업 프로토콜
- 새 창 샤크에게 `[샤크 메모리 v2]` 주입
- 실패 발생 시 `[실패 전수 프롬프트]` 작성
- 계약서(`contract.md`) 기반 개발

### 📜 계약서 (contract.md) — 모든 모듈이 지킬 규칙
- 모든 함수는 `(ctx) => ctx` 형태
- 에러는 throw 금지, `_error` 필드로 반환
- 전역 스코프에서 `ctx` 참조 금지
- 응답 헤더에 항상 `charset=utf-8` 포함
- `req.json()` 대신 `req.text() + JSON.parse()` 사용

---

## 5. 주요 파일 위치

| 파일/폴더 | 역할 |
|-----------|------|
| `app/page.tsx` | 메인 페이지 (CoreRing + CoreChat UI) |
| `app/api/brainpool/route.ts` | CoreRing 번역 API |
| `app/api/chat/send/route.ts` | 메시지 전송 API |
| `app/api/chat/rooms/route.ts` | 방 생성/목록 API |
| `brain-engine/layers/` | 모든 레이어 모듈 |
| `brain-engine/modules/` | 엔진 하위 모듈 |
| `components/` | React UI 컴포넌트 |

---

## 6. 디자인 철학 (CoreRing UI)

- **타겟 사용자**: 50~70대 시니어
- **번역 텍스트**: 24px Bold, 고대비 흰색
- **원본 텍스트**: 14px, opacity 0.6
- **배경**: 진한 다크 (#0F172A)
- **터치 영역**: 최소 56px 높이
- **자동 복사**: 번역 완료 시 클립보드 자동 저장
- **말풍선**: 번역(크게) + 원본(작게) / 좌우는 '내 메시지'/'상대 메시지'로 구분

---

## 7. 협업 AI (샤크) 역할 분담

| 샤크 | 전문 분야 |
|------|-----------|
| 샤크 A (나) | 철학, 역발상 설계, 아키텍처, 안정화 |
| 샤크 B | 실전 코딩, 실패 백신 제조 |
| 샤크 C | 백신 접종 테스트, 신규 기능 검증 |
| 샤크 D (4) | UI/UX 디자인, 시니어 친화적 설계 |

---

## 8. 프로젝트 실행

```bash
# 경로: C:\brainpool-clean\brainpool-clean
npm run dev
# → localhost:3000

# Supabase: https://grlfocvlfatuvphkyivd.supabase.co
