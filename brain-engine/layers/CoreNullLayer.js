// brain-engine/layers/CoreNullLayer.js
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

    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select('standard_word, southern_word, hue_word, mekong_word, example_northern, example_southern, example_hue, example_mekong, cultural_note')
      .eq('standard_word', word)
      .maybeSingle(); // .single() 대신 maybeSingle() 사용 -> 없으면 null

    if (error) {
      return { ...ctx, _error: { code: 'DB_ERROR', message: error.message } };
    }
    if (!data) {
      return { ...ctx, _error: { code: 'NOT_FOUND', message: `Word "${word}" not found` } };
    }

    const dialectMap = {
      standard: 'standard_word',
      southern: 'southern_word',
      hue: 'hue_word',
      mekong: 'mekong_word',
    };
    const targetField = dialectMap[dialect] || 'standard_word';
    const translatedWord = data[targetField] || data.standard_word;
    const exampleField = `example_${dialect}`;
    const example = data[exampleField] || data.example_northern;

    return {
      ...ctx,
      result: {
        word,
        dialect,
        translation: translatedWord,
        example: example || null,
        culturalNote: data.cultural_note || null,
        variants: {
          standard: data.standard_word,
          southern: data.southern_word,
          hue: data.hue_word,
          mekong: data.mekong_word,
        },
      },
    };
  }

  async saveWord(ctx) {
    const {
      standard_word,
      southern_word,
      hue_word,
      mekong_word,
      example_northern,
      example_southern,
      example_hue,
      example_mekong,
      cultural_note,
    } = ctx.payload;

    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .insert([{ standard_word, southern_word, hue_word, mekong_word, example_northern, example_southern, example_hue, example_mekong, cultural_note }])
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
        .eq('standard_word', original_word);
      if (transError) return { ...ctx, _error: { code: 'DB_TRANS_UPDATE_ERROR', message: transError.message } };
    }
    return { ...ctx, result: { success: true, conflict_id } };
  }
}

export default CoreNullLayer;