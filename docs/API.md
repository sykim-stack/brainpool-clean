# BRAINPOOL OS API 명세

**버전**: v3.0 | **작성일**: 2026-05-15

---

## 1. 기본 엔드포인트

### POST /api/brainpool

**주요 엔트리포인트** (CoreRing 전체 처리)

**Request Body**
```json
{
  "text": "string",
  "operation": "translate | emotion | culture | full | custom",
  "targetLang": "ko | en | ja | zh | ...",
  "options": {
    "emotionAnalysis": true,
    "cultureFilter": true,
    "traceId": "optional"
  }
}
Response
JSON{
  "payload": {
    "originalText": "...",
    "translatedText": "...",
    "emotion": { "primary": "joy", "score": 0.85 },
    "processedAt": "..."
  },
  "traceId": "bp-xxx-xxx-xxx",
  "_error": null
}

2. 에러 응답 형식
JSON{
  "payload": {},
  "traceId": "bp-xxx",
  "_error": {
    "code": "ERR_DEEPL_FAILED",
    "message": "번역 서비스 일시적 오류",
    "retryable": true
  }
}

3. 지원 Operations

translate — 단순 번역
emotion — 감정 분석
culture — 문화 필터링
full — CoreRing 전체 파이프라인 (기본값)
custom — 모듈 조합 커스텀


4. PowerShell 테스트 예시
PowerShellInvoke-RestMethod -Method POST -Uri "http://localhost:3000/api/brainpool" `
  -ContentType "application/json" `
  -Body (@{
    text = "오늘 정말 기분이 좋아!"
    operation = "full"
  } | ConvertTo-Json)

참조 문서

통합 마스터 문서
아키텍처