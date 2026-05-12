import { NextResponse } from 'next/server';

const initCtx = async (req: Request) => {
  const traceId = req.headers.get('x-trace-id') || `trace-${Math.random().toString(36).slice(2, 11)}`;
  return { req, traceId, payload: {} as any, result: null as any, _error: null as string | null };
};

const parseBody = async (ctx: any) => {
  if (ctx._error) return ctx;
  try {
    ctx.payload = JSON.parse(await ctx.req.text());
  } catch (e: any) {
    ctx._error = `PARSE_ERROR: ${e.message}`;
  }
  return ctx;
};

const validateConfig = (ctx: any) => {
  if (ctx._error) return ctx;
  const { apiKey, dbId } = ctx.payload;
  if (!apiKey || !dbId) ctx._error = 'NOTION_CONFIG_REQUIRED';
  return ctx;
};

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
          'Project':    { title:      [{ text: { content: project  || 'BRAINPOOL' } }] },
          'Last Task':  { rich_text:  [{ text: { content: lastTask || 'N/A' } }] },
          'Problems':   { rich_text:  [{ text: { content: problems || 'OK' } }] },
          'Updated At': { date: { start: new Date().toISOString() } },
        },
      }),
    });
    if (!res.ok) { ctx._error = `NOTION_ERROR: ${await res.text()}`; return ctx; }
    ctx.result = JSON.parse(await res.text());
  } catch (e: any) {
    ctx._error = `FETCH_ERROR: ${e.message}`;
  }
  return ctx;
};

export async function POST(request: Request) {
  let ctx = await initCtx(request);
  ctx = await parseBody(ctx);
  ctx = await validateConfig(ctx);
  ctx = await callNotionApi(ctx);
  return NextResponse.json(
    { success: !ctx._error, traceId: ctx.traceId, data: ctx.result, error: ctx._error },
    { status: ctx._error?.startsWith('FETCH_ERROR') ? 500 : 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
