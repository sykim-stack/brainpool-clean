const fs = require('fs');
const path = 'G:\\brainpool-clean\\brain-engine\\layers\\CoreNullLayer.js';

let src = fs.readFileSync(path, 'utf8');
const lines = src.split('\n');

// 1. switch에 getAudio 케이스 추가
const switchTarget = "case 'saveAudio':         return await this.saveAudio(ctx);";
const switchAdd    = "      case 'getAudio':          return await this.getAudio(ctx);";

const switchIdx = lines.findIndex(l => l.includes(switchTarget));
if (switchIdx === -1) {
  console.error('❌ switch 케이스 위치 못 찾음');
  process.exit(1);
}
lines.splice(switchIdx + 1, 0, switchAdd);
console.log('✅ switch 케이스 추가');

src = lines.join('\n');
const saveAudioEnd = src.indexOf("async saveAudio(ctx)");
if (saveAudioEnd === -1) {
  console.error('❌ saveAudio 메서드 못 찾음');
  process.exit(1);
}

const afterSaveAudio = src.indexOf('\n  async reportConflict', saveAudioEnd);
if (afterSaveAudio === -1) {
  console.error('❌ reportConflict 위치 못 찾음');
  process.exit(1);
}

const getAudioMethod = `
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
`;

const finalSrc = src.slice(0, afterSaveAudio) + getAudioMethod + src.slice(afterSaveAudio);
fs.writeFileSync(path, finalSrc, 'utf8');
console.log('✅ getAudio 메서드 추가 완료');