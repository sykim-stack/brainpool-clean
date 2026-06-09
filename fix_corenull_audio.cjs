const fs = require('fs');
const path = 'C:/brainpool-clean/brainpool-clean/brain-engine/layers/CoreNullLayer.js';
let content = fs.readFileSync(path, 'utf8');

// switch에 추가
content = content.replace(
  "      case 'getRandomWord':      return await this.getRandomWord(ctx);",
  "      case 'getRandomWord':      return await this.getRandomWord(ctx);\n      case 'saveAudio':         return await this.saveAudio(ctx);"
);

// saveAudio 메서드 추가
const saveAudioMethod = `
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
`;

content = content.replace(
  "  async reportConflict(ctx) {",
  saveAudioMethod + "\n  async reportConflict(ctx) {"
);

fs.writeFileSync(path, content, 'utf8');
console.log('완료:', content.includes('saveAudio') ? '성공' : '실패');
