import { NextResponse } from 'next/server';

/**
 * ?¦ˆ BRAINPOOL OS - Notion Sync Layer
 * [ê·œì¹™ ì¤€?? ctx => ctx ?¨í„´, throw ê¸ˆì?, UTF-8 ì²˜ë¦¬ ê°•ì œ
 */

// 1. ì´ˆê¸° ì»¨í…?¤íŠ¸ ?ì„±
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

// 2. ?”ì²­ ë°”ë”” ?Œì‹± (UTF8-ALL ì¤€??
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

// 3. ?¤ì • ê²€ì¦?
const validateConfig = (ctx: any) => {
  if (ctx._error) return ctx;
  const { apiKey, dbId } = ctx.payload;
  if (!apiKey || !dbId) {
    ctx._error = 'NOTION_CONFIG_REQUIRED';
  }
  return ctx;
};

// 4. Notion API ?¸ì¶œ
const callNotionApi = async (ctx: any) => {
  if (ctx._error) return ctx;

  const { apiKey, dbId, project, lastTask, problems } = ctx.payload;

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          'Project': { title: [{ text: { content: project || 'BRAINPOOL' } }] },
          'Last Task': { rich_text: [{ text: { content: lastTask || 'N/A' } }] },
          'Problems': { rich_text: [{ text: { content: problems || '?œí•­ ì¤? } }] },
          'Updated At': { date: { start: new Date().toISOString() } },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      ctx._error = `NOTION_API_ERROR: ${errText}`;
      return ctx;
    }

    // UTF8-ALL ì¤€?? res.json() ?€??text() ??parse
    const resText = await res.text();
    ctx.result = JSON.parse(resText);
  } catch (e: any) {
    ctx._error = `FETCH_ERROR: ${e.message}`;
  }
  return ctx;
};

// 5. ìµœì¢… ?‘ë‹µ ?ì„±
const finalizeResponse = (ctx: any) => {
  const responseBody = {
    success: !ctx._error,
    traceId: ctx.traceId,
    data: ctx.result,
    error: ctx._error
  };

  // ê³„ì•½?? 200(?ëŸ¬ ?¬í•¨) ?ëŠ” 500(ì¹˜ëª…???¤ë¥˜)ë§??¬ìš©
  const status = ctx._error && ctx._error.startsWith('FETCH_ERROR') ? 500 : 200;
  
  return NextResponse.json(responseBody, { 
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' } // UTF8 ?‘ë‹µ ?¤ë” ê°•ì œ
  });
};

// ë©”ì¸ ?¸ë“¤??
export async function POST(request: Request) {
  let ctx = await initCtx(request);
  
  // ?Œì´?„ë¼???¤í–‰
  ctx = await parseBody(ctx);
  ctx = await validateConfig(ctx);
  ctx = await callNotionApi(ctx);
  
  return finalizeResponse(ctx);
}
