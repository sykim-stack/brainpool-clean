```markdown
# 🧠 BRAINPOOL + HajunAI v5.0 Phase 0 "그림자 모드" BOSS 파일

> **기존 코드에 단 한 줄만 추가하고, 나머지는 모두 자동화하여 관제를 시작한다.**
>
> v1.0 | 2026-05-05 | BRAINPOOL 샤크팀

---

## 1. 개요: Phase 0 목표와 원칙

- **목표**: BRAINPOOL 프로젝트에 HajunAI v5.0을 **비개입 모드**로 연결하여 모든 API 요청의 trace 로그를 수집하고, 프로젝트 구조를 자동으로 이해한다.
- **원칙**:
  - 기존 코드 수정은 **단 한 줄의 미들웨어 추가**만 허용한다.
  - 절대 알림이나 자동 수정을 수행하지 않는다.
  - 수집된 데이터는 Supabase `debug_traces` 테이블에 안전하게 저장한다.

---

## 2. 사전 준비

### 2.1 환경 변수 확인

BRAINPOOL 프로젝트의 `.env.local`에 다음 변수가 이미 존재하는지 확인한다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://grlfocvlfatuvphkyivd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

HajunAI 관제용 Supabase 연결은 BRAINPOOL의 기존 Supabase 인스턴스를 그대로 사용한다.  
(단, 테이블은 HajunAI 전용 스키마 또는 별도 테이블을 사용할 수 있음)

### 2.2 필요한 Supabase 테이블 생성 (없을 경우)

```sql
-- trace 로그 저장용 테이블
CREATE TABLE IF NOT EXISTS hajunai_traces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trace_id text NOT NULL,
  endpoint text,
  method text,
  status_code int,
  duration_ms int,
  error text,
  created_at timestamptz DEFAULT now()
);

-- 시스템 이벤트 저장용 테이블 (향후 Phase 1에서 사용)
CREATE TABLE IF NOT EXISTS hajunai_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL, -- 'alert', 'violation', 'health_change'
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
```

---

## 3. Phase 0 핵심 액션: 딱 한 줄 추가

### 3.1 `middleware.ts` 생성 및 추가

BRAINPOOL 프로젝트 루트(`/app` 옆)에 `middleware.ts` 파일을 생성하고 아래 코드를 붙여넣는다.  
이 파일이 **Phase 0의 유일한 코드 변경**이다.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. traceId 확보 (요청 헤더에서 읽거나 새로 생성)
  const traceId = request.headers.get('x-trace-id') || crypto.randomUUID();

  // 2. 요청 객체에 traceId 주입 (후속 로직에서 참조 가능)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  // 3. 응답에도 traceId 헤더 포함
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-trace-id', traceId);

  // 4. 비동기 로그 저장 (응답 후 실행, 성능 영향 없음)
  const start = Date.now();
  response.headers.forEach((value, key) => { /* capture */ });
  
  // 간단한 로그 전송 (Supabase에 직접 쓰지 않고, 내부 API 호출 방식으로 우회 가능)
  // 하지만 Phase 0에서는 로그 수집을 생략하거나, 서버 콘솔에만 출력할 수 있음.
  // 여기서는 실제 저장을 위해 fetch를 사용할 수 있으나, 응답 지연을 막기 위해
  // `waitUntil` 또는 백그라운드 큐에 넣어야 함.
  
  // 간단하게 콘솔에만 출력 (Phase 0에서는 Supabase 저장은 Health 체크 API가 대신)
  console.log(`[trace] ${traceId} ${request.method} ${request.nextUrl.pathname}`);

  return response;
}

export const config = {
  matcher: '/api/:path*', // API 라우트에만 적용
};
```

> ✅ 이제 모든 API 요청에 `x-trace-id`가 부여되고, 콘솔에 trace 로그가 출력된다.

---

## 4. 프로젝트 자동 이해 (AutoDiscovery)

### 4.1 `hajunai.config.json` 생성

BRAINPOOL 프로젝트 루트에 `hajunai.config.json` 파일을 생성하고 아래 내용을 입력한다.

```json
{
  "projectName": "BRAINPOOL OS",
  "projectRoot": "C:\\brainpool-clean\\brainpool-clean",
  "entryPoints": [
    "app/api/brainpool/route.ts",
    "app/api/chat/**/*.ts",
    "app/api/corenull/route.ts",
    "app/api/debug/health/route.ts"
  ],
  "supabaseUrl": "https://grlfocvlfatuvphkyivd.supabase.co",
  "supabaseAnonKey": "${NEXT_PUBLIC_SUPABASE_ANON_KEY}",
  "observationMode": "passive",
  "phases": {
    "alert": false,
    "propose": false,
    "autoHeal": false
  }
}
```

### 4.2 AutoDiscovery 스크립트 실행 (수동 or 자동)

AutoDiscovery는 아직 완전한 AI 기반이 아니므로, **초기에는 수동으로 계약서와 API 스펙을 검토**한다.  
향후 자동화를 위해 아래와 같은 Node.js 스크립트를 `scripts/discover.mjs`로 생성해두고 실행할 수 있다.

```javascript
// scripts/discover.mjs
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function discover() {
  const config = JSON.parse(readFileSync('./hajunai.config.json', 'utf-8'));
  const routes = [];
  
  // API 라우트 파일 스캔
  for (const pattern of config.entryPoints) {
    const files = await glob(pattern);
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      // 간단히 export된 함수 이름과 HTTP 메서드 추출 (정규표현식)
      const methodMatch = content.match(/(?:export async function (GET|POST|PUT|DELETE|PATCH))/);
      if (methodMatch) {
        routes.push({
          path: file.replace('app/', '/').replace('/route.ts', ''),
          method: methodMatch[1],
          traceIdRequired: true,
        });
      }
    }
  }

  // api-spec.json 생성
  writeFileSync('./hajunai-api-spec.json', JSON.stringify({ routes }, null, 2));
  console.log(`✅ ${routes.length} 개의 API 엔드포인트를 발견했습니다.`);
}

discover();
```

실행: `node scripts/discover.mjs`

결과물: `hajunai-api-spec.json` 파일이 생성된다.

---

## 5. 계약서(contract.md) 템플릿 자동 생성

AutoDiscovery 후, BRAINPOOL의 기존 `MASTER.md`를 기반으로 계약서를 생성할 수 있다.  
이미 `MASTER.md`가 있으므로, 약간의 변환만 거치면 `hajunai-contract.md`로 사용 가능하다.

핵심 규칙만 추출하여 아래와 같은 마크다운 파일을 생성한다.

```markdown
# BRAINPOOL 계약서 (HajunAI v5.0 용)

## API 응답 규격
- 모든 API 응답은 `{ payload, _error, traceId }` 구조를 가져야 한다.
- `_error` 필드로 에러를 반환하고, 절대 `throw` 하지 않는다.
- `Content-Type: application/json; charset=utf-8` 헤더를 반드시 포함한다.

## UUID 및 invite_code
- `chat_rooms.id`는 UUID만 허용한다.
- `invite_code`는 6자 대문자 문자열만 허용한다.

## 언어 매핑
- `sourceLang`과 `targetLang` 필드명을 정확히 사용한다.
- 번역 결과는 `translations.ko`, `translations.vi` 형태로 저장한다.

## 데이터베이스
- `tb_trans_logs`에 번역 로그를 캐싱한다.
- 모든 테이블에는 RLS 정책이 적용되어야 한다.
```

---

## 6. 관찰 모드 활성화 (Phase 0 완료)

이제 HajunAI 확장 프로그램(v5.0)의 `ConfigPanel`에서 BRAINPOOL 프로젝트를 등록한다.

1. **프로젝트 폴더 지정**: `hajunai.config.json` 파일을 선택하거나 경로를 입력한다.
2. **상태 확인**: HealthMonitor가 `/api/debug/health` 엔드포인트를 주기적으로 확인하기 시작한다.
3. **trace 수집**: middleware가 기록한 trace 로그를 Supabase `hajunai_traces` 테이블에 저장하는 기능은 추후 Phase 1에서 API를 통해 연동한다. (지금은 콘솔 로그만)

---

## 7. 검증 체크리스트

- [ ] `middleware.ts`가 정상적으로 로드되고, API 호출 시 `x-trace-id` 헤더가 응답에 포함되는가?
- [ ] `hajunai.config.json` 파일이 프로젝트 루트에 존재하는가?
- [ ] `node scripts/discover.mjs` 실행 시 `hajunai-api-spec.json`이 생성되는가?
- [ ] 생성된 계약서(`hajunai-contract.md`)가 기존 MASTER.md의 핵심 규칙을 반영하는가?
- [ ] 기존 BRAINPOOL 기능에 아무런 영향이 없는가? (번역, 채팅, 방 생성 정상 동작)

---

## 8. 다음 단계 (Phase 1 준비)

Phase 0이 성공적으로 안착되면, HajunAI 확장 프로그램의 `HealthMonitor`와 `ProactiveAlertLayer`를 활성화한다.

- HealthMonitor가 `/api/debug/health`를 30초 간격으로 폴링하도록 설정
- `hajunai_events` 테이블에 상태 변경 이벤트 기록
- 첫 번째 알림: "BRAINPOOL 상태: 정상" 또는 "CoreRing 장애 감지"

---

> **📌 이 BOSS 파일은 BRAINPOOL에 HajunAI v5.0을 실제로 착륙시키기 위한 완전한 실행서입니다.**  
> 단 한 줄의 미들웨어 추가로 시작하여, 프로젝트의 신경계를 조용히 구축합니다.
```