export function createCtx(payload, traceId = crypto.randomUUID()) {
    return { payload, traceId, _error: null };
}
export function isError(ctx) { return ctx._error !== null; }
export function errorCtx(ctx, code, message, retryable = false) {
    return { ...ctx, _error: { code, message, retryable } };
}