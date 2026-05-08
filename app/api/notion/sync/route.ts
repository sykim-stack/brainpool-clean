import { NextResponse } from 'next/server';

/**
 * 🦈 BRAINPOOL OS - Notion Sync Layer
 * [규칙 준수] ctx => ctx 패턴, throw 금지, UTF-8 처리 강제
 */

// 1. 초기 컨텍스트 생성
const initCtx = async (req: Request) => {
  const traceId = req.headers.get('x-trace-id') || `trace-${Math.random().toString(36).slice(2, 11)}`;
  return {
    req,
    traceId,
    payload: {},
    result: null,
    _error: null,
    status: 200
  };
};

// 2. 요청 바디 파싱 (UTF8-ALL 준수)
const parseBody = async (ctx: any) => {
  if (ctx._error) return ctx;
  try {
    const text = await ctx.req.text();
    ctx.payload = JSON.parse(text);
  } catch (e: any) {
    ctx._error = `REQUEST_PARSE_ERROR: ${e.message}`;
  }
  return ctx;
};

// 3. 설정 검증
const validateConfig = (ctx: any) => {
  if (ctx._error) return ctx;
  const { apiKey, dbId } = ctx.payload;
  if (!apiKey || !dbId) {
    ctx._error = 'NOTION_CONFIG_REQUIRED';
  }
  return ctx;
};

// 4. Notion API 호출
const callNotionApi = async (ctx: any) => {
  if (ctx._error) return ctx;

  const { apiKey, dbId, project, lastTask, problems } = ctx.payload;

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          'Project': { title: [{ text: { content: project || 'BRAINPOOL' } }] },
          'Last Task': { rich_text: [{ text: { content: lastTask || 'N/A' } }] },
          'Problems': { rich_text: [{ text: { content: problems || '순항 중' } }] },
          'Updated At': { date: { start: new Date().toISOString() } },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      ctx._error = `NOTION_API_ERROR: ${errText}`;
      return ctx;
    }

    // UTF8-ALL 준수: res.json() 대신 text() 후 parse
    const resText = await res.text();
    ctx.result = JSON.parse(resText);
  } catch (e: any) {
    ctx._error = `FETCH_ERROR: ${e.message}`;
  }
  return ctx;
};

// 5. 최종 응답 생성
const finalizeResponse = (ctx: any) => {
  const responseBody = {
    success: !ctx._error,
    traceId: ctx.traceId,
    data: ctx.result,
    error: ctx._error
  };

  // 계약서: 200(에러 포함) 또는 500(치명적 오류)만 사용
  const status = ctx._error && ctx._error.startsWith('FETCH_ERROR') ? 500 : 200;
  
  return NextResponse.json(responseBody, { 
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' } // UTF8 응답 헤더 강제
  });
};

// 메인 핸들러
export async function POST(request: Request) {
  let ctx = await initCtx(request);
  
  // 파이프라인 실행
  ctx = await parseBody(ctx);
  ctx = await validateConfig(ctx);
  ctx = await callNotionApi(ctx);
  
  return finalizeResponse(ctx);
}