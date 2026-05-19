# BRAINPOOL OS - brainpool-clean

**CoreRing 기반 Next.js 구현체** (v3.0)

---

## 🚀 빠른 시작 (PowerShell)

```powershell
git clone https://github.com/sykim-stack/brainpool-clean.git
cd brainpool-clean
npm install
.env.local 생성
PowerShellNew-Item -Path .env.local -ItemType File
code .env.local
.env.local 내용:
envDEEPL_API_KEY=your_deepl_api_key_here
실행
PowerShellnpm run dev

📍 핵심 문서

BRAINPOOL OS 통합 마스터 문서 ← 모든 규칙의 진실 공급원
brainpool-os 본체


🧠 핵심 원칙

모든 모듈 (ctx) => ctx
throw 금지 → _error만 사용
traceId 연속성 유지
불변성 엄격 준수


📚 문서

API 명세
아키텍처
디버깅 가이드

관련 레포: brainpool-os