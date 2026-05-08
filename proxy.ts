// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const traceId = request.headers.get('x-trace-id') || crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-trace-id', traceId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set('x-trace-id', traceId);

  console.log(`[trace] ${traceId} ${request.method} ${request.nextUrl.pathname}`);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};