// app/api/corenull/route.ts
import { CoreNullLayer } from '@/brain-engine/layers/CoreNullLayer';

const layer = new CoreNullLayer();

export async function POST(req: Request) {
  const traceId = crypto.randomUUID();
  let payload;
  let rawBody = '';
  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody);
  } catch (e: any) {
    return new Response(JSON.stringify({ error: { code: 'PARSE_FAIL', message: `Invalid JSON: ${rawBody}`, details: e.message } }), { status: 400 });
  }
  
  const ctx = { payload, traceId, _error: null };
  let result: any;
  try {
    result = await layer.handle(ctx);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: { code: 'UNHANDLED', message: err.message, stack: err.stack } }), { status: 500 });
  }
  
  const status = result ? (result._error ? 500 : 200) : 200;
  return new Response(JSON.stringify(result || { traceId }, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}