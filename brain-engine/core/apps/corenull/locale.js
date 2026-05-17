// apps/corenull/locale.js
import { getSupabase } from '../../connectors/storage.js';
import { errorCtx } from '../../contracts/ctx.js';

export async function getLocale(ctx) {
    const { device_id } = ctx.payload;
    if (!device_id) return errorCtx(ctx, 'MISSING_PARAMS', 'device_id 필수');
    const supabase = getSupabase();
    const { data } = await supabase.from('core_users').select('vi_locale').eq('device_id', device_id).single();
    return { ...ctx, payload: { locale: data?.vi_locale || 'standard' }, _error: null };
}
export async function setLocale(ctx) {
    const { device_id, locale } = ctx.payload;
    if (!device_id || !locale) return errorCtx(ctx, 'MISSING_PARAMS', 'device_id, locale 필수');
    const supabase = getSupabase();
    const { error } = await supabase.from('core_users').upsert(
        { device_id, vi_locale: locale, updated_at: new Date().toISOString() },
        { onConflict: 'device_id' }
    );
    if (error) return errorCtx(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { locale }, _error: null };
}
