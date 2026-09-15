// modules/health-monitor.js — HajunAI v5.0 핵심 모듈

export async function HealthMonitor(ctx) {
  if (!ctx || ctx._error) return ctx;

  const { apiSpec } = ctx.payload || {};
  if (!apiSpec || !apiSpec.routes) {
    ctx._error = 'apiSpec.routes is required for health check';
    return ctx;
  }

  const results = {};

  for (const route of apiSpec.routes) {
    const url = `${apiSpec.baseUrl || 'http://localhost:3000'}${route.path}`;
    const start = Date.now();

    try {
      const res = await fetch(url, {
        method: route.method || 'GET',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-trace-id': ctx.traceId || `health_${Date.now()}`
        }
      });

      results[route.path] = {
        status: res.ok ? 'healthy' : 'degraded',
        statusCode: res.status,
        latencyMs: Date.now() - start,
      };
    } catch (e) {
      results[route.path] = {
        status: 'unreachable',
        error: e.message,
        latencyMs: Date.now() - start,
      };
    }
  }

  const hasUnhealthy = Object.values(results).some(r => r.status !== 'healthy');

  ctx.health = {
    status: hasUnhealthy ? 'degraded' : 'ok',
    checkedAt: new Date().toISOString(),
    modules: results,
  };

  // 장애 감지 시 이벤트 발행 (ProactiveAlertLayer로 전달될 신호)
  if (hasUnhealthy) {
    ctx.event = {
      type: 'system.degraded',
      module: Object.entries(results)
        .filter(([, r]) => r.status !== 'healthy')
        .map(([path]) => path)
        .join(', '),
      checkedAt: ctx.health.checkedAt,
    };
  }

  return ctx;
}