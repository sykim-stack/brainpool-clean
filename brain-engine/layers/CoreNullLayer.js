export class CoreNullLayer {
  async handle(ctx) {
    const action = ctx.payload?.action || ctx.action;
    switch (action) {
      case 'getWordData':   return await this.getWordData(ctx);
      case 'saveWord':      return await this.saveWord(ctx);
      case 'reportConflict':  return await this.reportConflict(ctx);
      case 'resolveConflict': return await this.resolveConflict(ctx);
      default:
        return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } };
    }
  }

  async getWordData(ctx) {
    const { word } = ctx.payload;
    if (!word) return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };
    const { data, error } = await ctx.supabase.from('tp_translations').select('*').eq('meaning_ko', word).maybeSingle();
    if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    if (!data) return { ...ctx, _error: { code: 'NOT_FOUND', message: `Word "${word}" not found` } };
    return { ...ctx, result: {
      word, standard: data.standard_word, southern: data.southern_word,
      hue: data.hue_word, mekong: data.mekong_word, meaning: data.meaning_ko,
      examples: data.example_northern ? [data.example_northern] : [],
      culturalNote: data.notes || null,
      riskScore: data.conflict_weight || 0,
      emotion: data.emotion_score > 0.5 ? '����' : '�߸�',
    }};
  }

  async saveWord(ctx) {
    const { data, error } = await ctx.supabase.from('tp_translations').insert([ctx.payload]).select().single();
    if (error) return { ...ctx, _error: { code: 'DB_INSERT_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async reportConflict(ctx) {
    const { source_word, target_word, dialect, description, reporter_id } = ctx.payload;
    const { data, error } = await ctx.supabase.from('tp_conflicts').insert([{ source_word, target_word, dialect, description, reporter_id, status: 'pending' }]).select().single();
    if (error) return { ...ctx, _error: { code: 'DB_CONFLICT_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async resolveConflict(ctx) {
    const { conflict_id, resolution_note, new_translation, original_word } = ctx.payload;
    const { error } = await ctx.supabase.from('tp_conflicts').update({ status: 'resolved', resolution_note, resolved_at: new Date() }).eq('id', conflict_id);
    if (error) return { ...ctx, _error: { code: 'DB_UPDATE_ERROR', message: error.message } };
    return { ...ctx, result: { success: true, conflict_id } };
  }
}

export default CoreNullLayer;
