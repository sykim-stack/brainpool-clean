// background.js — 30초마다 HealthMonitor 실행 후 Alert 연결
import { HealthMonitor } from './modules/health-monitor.js';
import { ProactiveAlertLayer } from './modules/proactive-alert-layer.js';

async function runHealthCheck() {
  const ctx = {
    traceId: `bg_${Date.now()}`,
    payload: {
      apiSpec: {
        baseUrl: 'http://localhost:3000',
        routes: [
          { path: '/api/brainpool', method: 'POST' },
          { path: '/api/debug/health', method: 'GET' },
        ],
      },
    },
  };

  const healthCtx = await HealthMonitor(ctx);
  if (healthCtx.event) {
    await ProactiveAlertLayer(healthCtx);
  }
}

// 30초 간격으로 헬스체크 실행
setInterval(runHealthCheck, 30000);
runHealthCheck(); // 최초 1회 즉시 실행