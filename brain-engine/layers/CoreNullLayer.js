// brain-engine/layers/CoreNullLayer.js
// CoreNull: 방언 사전 및 문화 충돌 관리 레이어 (클래스 기반)

export class CoreNullLayer {
  // 모든 메서드는 (ctx) => ctx 형태, throw 금지, _error 필드 사용

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

    // 1. 충돌 상태 업데이트
    const { error: updateError } = await ctx.supabase
      .from('tp_conflicts')
      .update({ status: 'resolved', resolution_note, resolved_at: new Date() })
      .eq('id', conflict_id);

    if (updateError) {
      return { ...ctx, _error: { message: updateError.message, code: 500 } };
    }

    // 2. 새 번역이 제공되면 tp_translations 업데이트
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

// 기본 내보내기 (필요시)
export default CoreNullLayer;