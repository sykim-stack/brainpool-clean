// apps/corenull/reaction.js
import { getSupabase } from '../../connectors/storage.js';
import { errorCtx } from '../../contracts/ctx.js';

export async function toggleReaction(ctx) {
    const { message_id, device_id } = ctx.payload;
    if (!message_id || !device_id)
        return errorCtx(ctx, 'MISSING_PARAMS', 'message_id, device_id 필수');
    const supabase = getSupabase();
    const { data: msg, error: fetchErr } = await supabase
        .from('messages').select('relations').eq('id', message_id).single();
    if (fetchErr) return errorCtx(ctx, 'DB_SELECT_FAIL', fetchErr.message, true);
    if (!msg) return errorCtx(ctx, 'NOT_FOUND', '메시지 없음');
    const reactions = msg.relations?.reaction_ids || [];
    const already = reactions.includes(device_id);
    const newReactions = already ? reactions.filter(id => id !== device_id) : [...reactions, device_id];
    const { data: updated, error: updateErr } = await supabase
        .from('messages')
        .update({ relations: { ...(msg.relations || {}), reaction_ids: newReactions } })
        .eq('id', message_id).select().single();
    if (updateErr) return errorCtx(ctx, 'DB_UPDATE_FAIL', updateErr.message, true);
    return { ...ctx, payload: { message: updated, reacted: !already, reaction_count: newReactions.length }, _error: null };
}
