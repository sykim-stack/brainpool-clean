// brain-engine/layers/CoreNullLayer.js
// DB 스키마: id, standard_word, southern_word, hue_word, mekong_word, meaning_ko, meaning_en,
// part_of_speech, category_main, category_sub, pronunciation_diff, conversion_rule,
// frequency, formality_level, generation, region, example_northern, example_southern,
// notes, created_at, entry_type, dialect, status, source, emotion_score, conflict_weight

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
      case 'saveAudio':         return await this.saveAudio(ctx);
      case 'getAudio':          return await this.getAudio(ctx);
      default:
        return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } };
    }
  }

  async getWordData(ctx) {
    const { word, dialect = 'standard' } = ctx.payload;
    if (!word) return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };

    const SELECT_COLS =
      'standard_word, southern_word, hue_word, mekong_word, meaning_ko, ' +
      'example_northern, example_southern, notes, part_of_speech, ' +
      'pronunciation_diff, conversion_rule, frequency, formality_level, ' +
      'emotion_score, conflict_weight';

    const isKorean = /[가-힣]/.test(word);
    let data = null;

    if (isKorean) {
      // 한국어 입력 → meaning_ko 정확 일치 우선, 없으면 부분 일치
      const r1 = await ctx.supabase.from('tp_translations')
        .select(SELECT_COLS).eq('meaning_ko', word).maybeSingle();
      if (r1.error) return { ...ctx, _error: { code: 'DB_ERROR', message: r1.error.message } };
      data = r1.data;

      if (!data) {
        const r2 = await ctx.supabase.from('tp_translations')
          .select(SELECT_COLS).ilike('meaning_ko', `%${word}%`).limit(1).maybeSingle();
        if (r2.error) return { ...ctx, _error: { code: 'DB_ERROR', message: r2.error.message } };
        data = r2.data;
      }
    } else {
      // 베트남어 입력 → standard_word 정확 일치 우선 (대소문자 무시)
      const r1 = await ctx.supabase.from('tp_translations')
        .select(SELECT_COLS).ilike('standard_word', word).maybeSingle();
      if (r1.error) return { ...ctx, _error: { code: 'DB_ERROR', message: r1.error.message } };
      data = r1.data;

      // 없으면 southern_word / hue_word 등도 체크
      if (!data) {
        const r2 = await ctx.supabase.from('tp_translations')
          .select(SELECT_COLS)
          .or(`southern_word.ilike.${word},hue_word.ilike.${word},mekong_word.ilike.${word}`)
          .limit(1).maybeSingle();
        if (r2.error) return { ...ctx, _error: { code: 'DB_ERROR', message: r2.error.message } };
        data = r2.data;
      }
    }

    if (!data) return { ...ctx, _error: { code: 'NOT_FOUND', message: `Word "${word}" not found` } };

    // tb_trans_logs에서 이 단어의 최근 분석값 가져오기 (위험 점수 등)
    let analysisData: any = null;
    try {
      const { data: logData } = await ctx.supabase
        .from('tb_trans_logs')
        .select('emotion, emotion_score, risk_score, intent, detected_dialect, meaning_score')
        .or(`source_text.eq.${word},standard_vi.eq.${word}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      analysisData = logData;
    } catch (e) { /* 분석값 없어도 카드는 표시 */ }

    const example = (dialect === 'southern')
      ? data.example_southern
      : data.example_northern;

    return { ...ctx, result: {
      word,
      standard:    data.standard_word,
      southern:    data.southern_word,
      hue:         data.hue_word,
      mekong:      data.mekong_word,
      meaning:     data.meaning_ko,
      examples:    example ? [example] : [],
      culturalNote: data.notes || null,
      // tp_translations 기본값 + tb_trans_logs 분석값 우선 적용
      riskScore:   analysisData?.risk_score ?? data.conflict_weight ?? 0,
      emotion:     analysisData?.emotion || null,
      emotionScore: analysisData?.emotion_score ?? data.emotion_score ?? null,
      meaningScore: analysisData?.meaning_score ?? null,
      intent:      analysisData?.intent || null,
      detectedDialect: analysisData?.detected_dialect || 'unknown',
      emotion:     (data.emotion_score || 0) > 0.5 ? '긍정' : '중립',
      partOfSpeech: data.part_of_speech,
    }};
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
      word:         random.standard_word,
      meaning:      random.meaning_ko,
      usage:        random.example_northern || null,
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
    const allowed = ['is_bookmarked', 'learn_status', 'memo', 'review_at', 'meaning_kr'];
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


  async saveAudio(ctx) {
    const { user_id, word, dialect, audio_url, session_id, trans_id } = ctx.payload;
    if (!user_id || !audio_url) return { ...ctx, _error: { code: 'MISSING_PARAMS', message: 'user_id and audio_url required' } };
    const { data, error } = await ctx.supabase
      .from('audio_contributions')
      .insert([{ user_id, word: word || '', dialect: dialect || 'standard', audio_url, session_id: session_id || null, trans_id: trans_id || null }])
      .select()
      .single();
    if (error) return { ...ctx, _error: { code: 'DB_INSERT_ERROR', message: error.message } };
    return { ...ctx, result: data };
  }
  async getAudio(ctx) {
    const { word, dialect } = ctx.payload;
    if (!word) return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };
    let query = ctx.supabase
      .from('audio_contributions')
      .select('audio_url, user_id, created_at')
      .eq('word', word)
      .order('created_at', { ascending: false })
      .limit(1);
    if (dialect) query = query.eq('dialect', dialect);
    const { data, error } = await query.maybeSingle();
    if (error) return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    if (!data) return { ...ctx, result: null };
    return { ...ctx, result: { audio_url: data.audio_url } };
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
    const { conflict_id, resolution_note, new_translation, original_word } = ctx.payload;
    const { error: updateError } = await ctx.supabase
      .from('tp_conflicts')
      .update({ status: 'resolved', resolution_note, resolved_at: new Date() })
      .eq('id', conflict_id);
    if (updateError) return { ...ctx, _error: { code: 'DB_UPDATE_ERROR', message: updateError.message } };
    if (new_translation && original_word) {
      const { error: transError } = await ctx.supabase
        .from('tp_translations')
        .update({ standard_word: new_translation })
        .eq('meaning_ko', original_word);
      if (transError) return { ...ctx, _error: { code: 'DB_TRANS_UPDATE_ERROR', message: transError.message } };
    }
    return { ...ctx, result: { success: true, conflict_id } };
  }
}

export default CoreNullLayer;