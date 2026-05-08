// DB 스키마: id, standard_word, southern_word, hue_word, mekong_word, meaning_ko, meaning_en,
// part_of_speech, category_main, category_sub, pronunciation_diff, conversion_rule,
// frequency, formality_level, generation, region, example_northern, example_southern,
// notes, created_at, entry_type, dialect, status, source, emotion_score, conflict_weight

export class CoreNullLayer {
  async handle(ctx) {
    const action = ctx.payload?.action || ctx.action;
    switch (action) {
      case 'getWordData':
        return await this.getWordData(ctx);
      case 'saveWord':
        return await this.saveWord(ctx);
      case 'reportConflict':
        return await this.reportConflict(ctx);
      case 'resolveConflict':
        return await this.resolveConflict(ctx);
      default:
        return { ...ctx, _error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}` } };
    }
  }

  async getWordData(ctx) {
    const { word, dialect = 'standard' } = ctx.payload;
    if (!word) {
      return { ...ctx, _error: { code: 'MISSING_WORD', message: 'word is required' } };
    }

    // 실제 컬럼만 SELECT
    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select('standard_word, southern_word, hue_word, mekong_word, meaning_ko, example_northern, example_southern, notes, part_of_speech, pronunciation_diff, conversion_rule, frequency, formality_level, emotion_score, conflict_weight')
      .eq('meaning_ko', word)   // meaning_ko로 검색 (한국어 뜻)
      .maybeSingle();

    if (error) {
      return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    }
    if (!data) {
      return { ...ctx, _error: { code: 'NOT_FOUND', message: `Word "${word}" not found in meaning_ko` } };
    }

    const dialectMap = {
      standard: 'standard_word',
      southern: 'southern_word',
      hue: 'hue_word',
      mekong: 'mekong_word',
    };
    const targetField = dialectMap[dialect] || 'standard_word';
    const translatedWord = data[targetField] || data.standard_word;

    // 예문: northern/southern만 존재
    let example = null;
    if (dialect === 'standard' || dialect === 'northern') example = data.example_northern;
    else if (dialect === 'southern') example = data.example_southern;
    // hue, mekong은 example_northern fallback (없으면 null)
    else if (dialect === 'hue' || dialect === 'mekong') example = data.example_northern;

    // WordModal.tsx가 기대하는 구조로 평탄화하여 반환
    return {
      ...ctx,
      result: {
        word,
        standard: data.standard_word,
        southern: data.southern_word,
        hue: data.hue_word,
        mekong: data.mekong_word,
        meaning: data.meaning_ko,
        examples: data.example_northern ? [data.example_northern] : [],
        culturalNote: data.notes || null,
        riskScore: data.conflict_weight || 0, // riskScore로 매핑
        emotion: data.emotion_score > 0.5 ? '긍정' : '중립',
        partOfSpeech: data.part_of_speech,
      },
    };
  }

  async saveWord(ctx) {
    // 실제 존재하는 컬럼만 삽입 (example_hue, cultural_note 등 없음)
    const {
      standard_word, southern_word, hue_word, mekong_word,
      meaning_ko, meaning_en, part_of_speech,
      category_main, category_sub, pronunciation_diff, conversion_rule,
      frequency, formality_level, generation, region,
      example_northern, example_southern, notes,
      entry_type, dialect, status, source,
      emotion_score, conflict_weight
    } = ctx.payload;

    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .insert([{
        standard_word, southern_word, hue_word, mekong_word,
        meaning_ko, meaning_en, part_of_speech,
        category_main, category_sub, pronunciation_diff, conversion_rule,
        frequency, formality_level, generation, region,
        example_northern, example_southern, notes,
        entry_type, dialect, status, source,
        emotion_score, conflict_weight
      }])
      .select()
      .single();

    if (error) return { ...ctx, _error: { code: 'DB_INSERT_ERROR', message: error.message } };
    return { ...ctx, result: data };
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