// apps/corenull/interests.js
import { getSupabase } from '../../connectors/storage.js';
import { errorCtx } from '../../contracts/ctx.js';

export async function getInterests(ctx) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('corenull_interests').select('*').order('sort_order');
    if (error) return errorCtx(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { interests: data || [] }, _error: null };
}

export async function setInterests(ctx) {
    const { device_id, interest_ids } = ctx.payload;
    if (!device_id || !Array.isArray(interest_ids))
        return errorCtx(ctx, 'MISSING_PARAMS', 'device_id, interest_ids 배열 필수');
    const supabase = getSupabase();
    const { error } = await supabase.from('core_users').upsert(
        { device_id, interest_ids, updated_at: new Date().toISOString() },
        { onConflict: 'device_id' }
    );
    if (error) return errorCtx(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { saved: true }, _error: null };
}
