// apps/corenull/house.js
import { getSupabase } from '../../connectors/storage.js';
import { errorCtx } from '../../contracts/ctx.js';

export async function getHouse(ctx) {
    const { slug, owner_key } = ctx.payload;
    if (!slug) return errorCtx(ctx, 'MISSING_PARAMS', 'slug 필수');
    const supabase = getSupabase();
    let query = supabase.from('corenull_houses').select('*').eq('slug', slug);
    if (owner_key) query = query.eq('owner_key', owner_key);
    const { data, error } = await query.single();
    if (error || !data) return errorCtx(ctx, 'NOT_FOUND', '하우스 없음');
    return { ...ctx, payload: { house: data }, _error: null };
}
export async function joinHouse(ctx) {
    const { device_id, house_id } = ctx.payload;
    if (!device_id || !house_id) return errorCtx(ctx, 'MISSING_PARAMS', 'device_id, house_id 필수');
    const supabase = getSupabase();
    const { error } = await supabase.from('corenull_house_members').upsert(
        { device_id, house_id, joined_at: new Date().toISOString() },
        { onConflict: 'device_id,house_id' }
    );
    if (error) return errorCtx(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { joined: true }, _error: null };
}
