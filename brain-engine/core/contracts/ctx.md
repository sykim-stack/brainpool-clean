# ctx 계약서

## 구조
- payload: any
- traceId: string (UUID)
- _error: null | { code, message, retryable }

## 규칙
1. 모든 함수는 (ctx) => ctx
2. throw 금지 — _error로 반환
3. traceId 항상 유지
4. Supabase 접근은 connectors/storage.js 통해서만