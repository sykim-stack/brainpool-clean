BRAINPOOL OS – CoreRing 구현 완료 문서
버전: 3.0 (2026-05-01)
상태: CoreRing 모듈화 완료, DeepL 연동 + mock fallback 동작 확인
목표: 확장 가능한 모듈-엔진-레이어 기반의 언어/감정/문화 처리 시스템

📦 프로젝트 구조
text
brainpool-clean/
├── brain-engine/               # 핵심 엔진 모듈 (재사용 가능)
│   ├── modules/
│   │   ├── detectLanguage.js
│   │   ├── translate.js        # DeepL + mock fallback
│   │   ├── contextFilter.js
│   │   ├── emotionFilter.js
│   │   └── index.js
│   ├── engines/
│   │   ├── pipeline.js         # 순차 실행기
│   │   ├── coreRingEngine.js   # 조합 엔진
│   │   └── index.js
│   └── layers/
│       └── CoreRingLayer.js    # 상태 없는 레이어 컨테이너
├── app/
│   ├── api/
│   │   └── brainpool/
│   │       └── route.js        # POST /api/brainpool
│   ├── layout.js               # 루트 레이아웃
│   └── page.js                 # 테스트 UI
├── .env.local                  # DeepL API 키 등
├── package.json                # 의존성 (next, react, axios)
└── README.md                   # 이 문서
🧠 핵심 아키텍처
🔹 소켓 규격 (모듈 간 계약)
모든 모듈은 (ctx) => ctx 형태.

ctx는 반드시 { payload, traceId, _error? } 구조.

불변성: 새 객체 반환, 원본 수정 금지.

에러는 throw 대신 _error 필드로 반환.

🔹 모듈 → 엔진 → 레이어
모듈: 단일 기능, stateless (예: detectLanguage)

엔진: 모듈 조합기 (예: coreRingEngine = [detectLanguage, translate, ...])

레이어: stateless 서비스 컨테이너 (예: CoreRingLayer.process())

🔹 실행 흐름
text
사용자 입력 → API → CoreRingLayer.process() → coreRingEngine.runPipeline()
    → detectLanguage → translate → contextFilter → emotionFilter → 결과 반환
🚀 설치 및 실행
bash
# 1. 저장소 클론 (또는 새 폴더 생성)
git clone <repository-url>
cd brainpool-clean

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정 (`.env.local`)
DEEPL_API_KEY=your_deepl_api_key_here

# 4. 개발 서버 실행
npm run dev

# 5. 테스트
curl -X POST http://localhost:3000/api/brainpool \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요"}'
📡 API 명세
POST /api/brainpool
요청

json
{
  "text": "번역할 문장"
}
응답 (성공)

json
{
  "payload": {
    "text": "안녕하세요",
    "sourceLang": "ko",
    "translatedText": "Xin chào",
    "culturalNote": "중립",
    "emotionScore": 0.3,
    "source": "deepl" | "mock"
  },
  "traceId": "uuid",
  "_error": null
}
응답 (실패 – 모듈 내부 에러)

json
{
  "payload": { ... },
  "traceId": "uuid",
  "_error": {
    "code": "TRANSLATE_FAIL",
    "message": "번역 실패",
    "retryable": true
  }
}
🧩 모듈 추가 가이드
1. 새 모듈 작성 (brain-engine/modules/myModule.js)
javascript
export default async function myModule(ctx) {
  // ctx.payload에서 필요한 값 추출
  const { someField } = ctx.payload;
  // 로직 수행
  const result = ...;
  // 성공 시 새 객체 반환
  return { ...ctx, payload: { ...ctx.payload, newField: result } };
  // 실패 시 _error 반환
  // return { ...ctx, _error: { code: 'MY_ERROR', message: '...', retryable: false } };
}
2. modules/index.js에 export 추가
javascript
export { default as myModule } from './myModule.js';
3. 엔진에 모듈 추가 (engines/coreRingEngine.js)
javascript
import { myModule } from '../modules/index.js';
export const coreRingEngine = (ctx) => runPipeline(ctx, [
  detectLanguage, translate, myModule, contextFilter, emotionFilter
]);
🛠️ 문제 해결
DeepL 403 오류
원인: 인증 방식이 잘못됨 (URLSearchParams vs Authorization 헤더)

해결: translate.js에서 Authorization: DeepL-Auth-Key ${key} 헤더 사용.

Hydration mismatch / 세션 오류
해결: middleware, proxy, app/api/session 제거. sessionId는 클라이언트(localStorage)에서 관리.

모듈 import 오류
원인: 상대 경로 잘못됨.

해결: route.js에서 ../../../brain-engine/layers/CoreRingLayer.js 확인.

📚 확장 계획 (Phase 1+)
CoreChatLayer: 상태ful 채팅 레이어 (방, 메시지, 참여자 관리)

CoreNullLayer: 기록/UI 레이어 (스토리 CRUD, 포스트 렌더링)

디버그 로깅: Supabase debug_traces 테이블에 traceId 저장

Gemini fallback: DeepL 실패 시 Gemini 번역 연동

감정/문화 고도화: ML 모델 또는 규칙 확장

🧠 핵심 원칙 (불변)
UI는 상태만 렌더한다 (로직 없음)

모든 통신은 Action Envelope ({ type, status, payload, source, traceId })

에러는 반환 (throw 금지)

traceId 필수 (전 구간 추적)

모듈은 소켓 규격 준수 (불변성, 단일 객체 인자)

엔진은 모듈 조합기 (stateless)

레이어는 서비스 컨테이너 (stateless)

레이어 간 직접 호출 금지 (HajunAI 또는 Event Bus)

하나의 레이어 실패는 다른 레이어에 영향 없음

📄 라이선스
ISC

이 문서는 BRAINPOOL OS의 공식 구현 가이드입니다.
문서 버전: 3.0
작성자: HajunAI (여리) & Shark 🦈
마지막 업데이트: 2026-05-01

## 📚 세부 문서

- [API 명세](docs/API.md)
- [아키텍처 개요](docs/ARCHITECTURE.md)
- [모듈 명세](docs/MODULE_SPEC.md)
- [레이어 개발 가이드](docs/LAYER_GUIDE.md)
- [디버깅 가이드](docs/DEBUGGING.md)
- [로드맵](docs/ROADMAP.md)"# corechat" 
# corechat
