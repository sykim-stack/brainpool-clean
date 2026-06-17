$content = @'
# CORERING_ISSUES.md
_작성일: 2026-06-17_

## 미해결 버그 및 개선 사항

### 🔴 버그 (수정 필요)

#### 1. 카카오톡 공유 빈 페이지 문제
- **증상**: 카카오톡 공유하기 버튼 클릭 시 빈 페이지 열림
- **원인**: 코어링 문자열(한글/특수문자)이 URL에 포함되어 깨짐
- **파일**: components/ShareRoomModal.tsx
- **해결 방향**: 공유 URL 인코딩 처리, 카카오 SDK 적용

#### 2. 음성 발음 공유 불가 문제
- **증상**: WordModal에서 발음 녹음한 사람만 🔊 버튼 보임
           다른 사람은 녹음된 발음을 들을 수 없음
- **원인**: audioUrl이 로컬 state에만 저장되고 DB에서 불러오지 않음
- **파일**: components/WordModal.tsx
- **해결 방향**: 
  - audio_contributions 테이블에서 해당 word의 발음 조회
  - 다른 사람이 접속해도 발음 들을 수 있도록
  - /api/phrase에 getAudio 액션 추가 필요

### 🟡 개선 (기능 추가)

#### 3. 번역 결과에 TTS 발음 추가
- **요청**: 텍스트/음성 번역 결과에 기계음이라도 발음 제공
- **방향 A**: Web Speech API TTS (무료, 브라우저 내장)
```javascript
  const utterance = new SpeechSynthesisUtterance(translatedText);
  utterance.lang = 'vi-VN'; // 베트남어
  speechSynthesis.speak(utterance);
```
- **방향 B**: 원어민 음성 있으면 원어민 발음, 없으면 TTS fallback
- **파일**: components/ChatBubble.tsx, components/WordModal.tsx

### 🟢 iOS 플랫폼 한계 (해결 불가 - 메모용)
- Web Push 알림 미지원
- Web Speech API STT 제한
- MediaRecorder webm 미지원
- → 장기적으로 React Native 앱 필요

## 다음 세션 작업 순서

컴퓨터 초기화 후 깃허브 동기화
버그 1: 카카오 공유 URL 수정
버그 2: 발음 공유 기능 (getAudio API)
개선 3: TTS 발음 추가

'@

$content | Set-Content "C:\brainpool-clean\brainpool-clean\CORERING_ISSUES.md" -Encoding UTF8
Write-Host "완료"