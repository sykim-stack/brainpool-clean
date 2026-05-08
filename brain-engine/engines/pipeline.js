// brain-engine/engines/pipeline.js
export async function runPipeline(ctx, modules) {
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    if (typeof mod !== 'function') {
      console.error(`Module at index ${i} is not a function:`, mod);
      console.error('Module name:', Object.keys(mod)[0] || 'unknown');
      return { ...ctx, _error: { code: 'INVALID_MODULE', message: `Module ${i} is not a function` } };
    }
    ctx = await mod(ctx);
    if (ctx._error) break;
  }
  return ctx;
}