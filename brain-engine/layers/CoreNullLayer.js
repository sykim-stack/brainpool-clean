export class CoreNullLayer {
  async handle(ctx) {
    const action = ctx.payload?.action || ctx.action;
    switch (action) {
      case 'getWordData':        return await this.getWordData(ctx);
      case 'saveWord':           return await this.saveWord(ctx);
      case 'getUserVocabulary':  return await this.getUserVocabulary(ctx);
      case 'updateVocabulary':   return await this.updateVocabulary(ctx);
      case 'deleteVocabulary':   return await this.deleteVocabulary(ctx);
      case 'reportConflict':     return await this.reportConflict(ctx);
      case 'resolveConflict':    return await this.resolveConflict(ctx);
      case 'getRandomWord':      return await this.getRandomWord(ctx);
      case 'getWordsFromSentence': return await this.getWordsFromSentence(ctx);
      default:
        return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } };
    }
  }

  async getWordData(ctx) {
    const { word } = ctx.payload;
    if (!word) return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };
    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select('*')
      .or(`standard_word.eq.${word},meaning_ko.eq.${word}`)
      .maybeSingle();
    if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    if (!data)  return { ...ctx, _error: { code: 'NOT_FOUND', message: `"${word}" not found` } };
    return { ...ctx, result: {
      word:        data.standard_word,
      standard:    data.standard_word,
      southern:    data.southern_word,
      hue:         data.hue_word,
      mekong:      data.mekong_word,
      meaning:     data.meaning_ko,
      examples:    [data.example_northern, data.example_southern].filter(Boolean),
      culturalNote: data.notes || null,
      riskScore:   data.conflict_weight || 0,
      emotion:     (data.emotion_score || 0) > 0.5 ? '긍정' : '중립',
    }};
  }

  async getWordsFromSentence(ctx) {
    const { sentence } = ctx.payload;
    if (!sentence) return { ...ctx, _error: { code: 'MISSING_SENTENCE', message: 'sentence is required' } };
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return { ...ctx, _error: { code: 'EMPTY_SENTENCE', message: 'no words found' } };
    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select('standard_word, meaning_ko, southern_word, notes, emotion_score, conflict_weight')
      .in('standard_word', words);
    if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    return { ...ctx, result: { words: data || [], total: words.length, matched: (data || []).length } };
  }

  async getRandomWord(ctx) {
    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select('standard_word, meaning_ko, example_northern, notes')
      .not('meaning_ko', 'is', null)
      .limit(50);
    if (error || !data?.length)
      return { ...ctx, _error: { code: 'NOT_FOUND', message: 'No words found' } };
    const random = data[Math.floor(Math.random() * data.length)];
    return { ...ctx, result: {
      word:        random.standard_word,
      meaning:     random.meaning_ko,
      usage:       random.example_northern || null,
      culturalNote: random.notes || null,
    }};
  }

  async saveWord(ctx) {
    const { user_id, trans_id, word, meaning_kr, source_session_id } = ctx.payload;
    if (!word) return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };
    if (!user_id) return { ...ctx, _error: { code: 'MISSING_USER', message: 'user_id is required' } };
    const insertData = { user_id, word, meaning_kr, source_session_id };
    if (trans_id) insertData.trans_id = trans_id;
    const { data, error } = await ctx.supabase
      .from('user_vocabulary')
      .insert([insertData])
      .select()
      .single();
    if (error) return { ...ctx, _error: { code: 'DB_INSERT_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async getUserVocabulary(ctx) {
    const { user_id } = ctx.payload;
    if (!user_id) return { ...ctx, _error: { code: 'MISSING_USER', message: 'user_id is required' } };
    const { data, error } = await ctx.supabase
      .from('user_vocabulary')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });
    if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async updateVocabulary(ctx) {
    const { id, user_id, ...fields } = ctx.payload;
    if (!id || !user_id) return { ...ctx, _error: { code: 'MISSING_PARAMS', message: 'id and user_id are required' } };
    const allowed = ['is_bookmarked', 'learn_status', 'memo', 'review_at'];
    const update = Object.fromEntries(
      Object.entries(fields).filter(([k]) => allowed.includes(k))
    );
    if (!Object.keys(update).length) return { ...ctx, _error: { code: 'NO_FIELDS', message: 'No valid fields to update' } };
    const { data, error } = await ctx.supabase
      .from('user_vocabulary')
      .update(update)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();
    if (error) return { ...ctx, _error: { code: 'DB_UPDATE_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async deleteVocabulary(ctx) {
    const { id, user_id } = ctx.payload;
    if (!id || !user_id) return { ...ctx, _error: { code: 'MISSING_PARAMS', message: 'id and user_id are required' } };
    const { error } = await ctx.supabase
      .from('user_vocabulary')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);
    if (error) return { ...ctx, _error: { code: 'DB_DELETE_ERROR', message: error.message } };
    return { ...ctx, result: { success: true, id } };
  }

  async reportConflict(ctx) {
    const { source_word, target_word, dialect, description, reporter_id } = ctx.payload;
    const { data, error } = await ctx.supabase
      .from('tp_conflicts')
      .insert([{ source_word, target_word, dialect, description, reporter_id, status: 'pending' }])
      .select()
      .single();
    if (error) return { ...ctx, _error: { code: 'DB_CONFLICT_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }

  async resolveConflict(ctx) {
    const { conflict_id, resolution_note } = ctx.payload;
    const { error } = await ctx.supabase
      .from('tp_conflicts')
      .update({ status: 'resolved', resolution_note, resolved_at: new Date() })
      .eq('id', conflict_id);
    if (error) return { ...ctx, _error: { code: 'DB_UPDATE_ERROR', message: error.message } };
    return { ...ctx, result: { success: true, conflict_id } };
  }
}

export default CoreNullLayer;
