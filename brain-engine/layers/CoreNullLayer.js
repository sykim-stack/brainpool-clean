// brain-engine/layers/CoreNullLayer.js
// CoreNull: 방언 사전 및 문화 충돌 관리 레이어 (클래스 + handle 라우터)

export class CoreNullLayer {
  // 라우터: action에 따라 적절한 메서드 호출
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
        return {
          ...ctx,
          _error: { code: 'UNKNOWN_ACTION', message: `Action '${action}' not supported` }
        };
    }
  }

  async getWordData(ctx) {
    const { word, dialect = 'standard' } = ctx.payload;

    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .select(`
        standard_word,
        southern_word,
        hue_word,
        mekong_word,
        example_northern,
        example_southern,
        example_hue,
        example_mekong,
        cultural_note
      `)
      .eq('standard_word', word)
      .single();

    if (error || !data) {
      return {
        ...ctx,
        _error: { message: 'Word not found', code: 404 }
      };
    }

    const dialectMap = {
      standard: 'standard_word',
      southern: 'southern_word',
      hue: 'hue_word',
      mekong: 'mekong_word'
    };
    const targetField = dialectMap[dialect] || 'standard_word';
    const translatedWord = data[targetField] || data.standard_word;
    const exampleField = `example_${dialect}`;
    const example = data[exampleField] || data.example_northern;

    return {
      ...ctx,
      result: {
        word: ctx.payload.word,
        dialect,
        translation: translatedWord,
        example,
        culturalNote: data.cultural_note || null,
        variants: {
          standard: data.standard_word,
          southern: data.southern_word,
          hue: data.hue_word,
          mekong: data.mekong_word
        }
      }
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
      cultural_note
    } = ctx.payload;

    const { data, error } = await ctx.supabase
      .from('tp_translations')
      .insert([{
        standard_word,
        southern_word,
        hue_word,
        mekong_word,
        example_northern,
        example_southern,
        example_hue,
        example_mekong,
        cultural_note
      }])
      .select()
      .single();

    if (error) {
      return { ...ctx, _error: { message: error.message, code: 500 } };
    }
    return { ...ctx, result: data };
  }

  async reportConflict(ctx) {
    const { source_word, target_word, dialect, description, reporter_id } = ctx.payload;

    const { data, error } = await ctx.supabase
      .from('tp_conflicts')
      .insert([{
        source_word,
        target_word,
        dialect,
        description,
        reporter_id,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) {
      return { ...ctx, _error: { message: error.message, code: 500 } };
    }
    return { ...ctx, result: data };
  }

  async resolveConflict(ctx) {
    const { conflict_id, resolution_note, new_translation, original_word } = ctx.payload;

    const { error: updateError } = await ctx.supabase
      .from('tp_conflicts')
      .update({ status: 'resolved', resolution_note, resolved_at: new Date() })
      .eq('id', conflict_id);

    if (updateError) {
      return { ...ctx, _error: { message: updateError.message, code: 500 } };
    }

    if (new_translation && original_word) {
      const { error: transError } = await ctx.supabase
        .from('tp_translations')
        .update({ standard_word: new_translation })
        .eq('standard_word', original_word);

      if (transError) {
        return { ...ctx, _error: { message: transError.message, code: 500 } };
      }
    }

    return { ...ctx, result: { success: true, conflict_id } };
  }
}

export default CoreNullLayer;