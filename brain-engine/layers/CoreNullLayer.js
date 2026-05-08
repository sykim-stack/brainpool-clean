/**
 * CoreNullLayer.js (ES Module 버전)
 * =====================================================
 */

import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_ACTIONS = new Set([
  'get-house', 'update-house',
  'create-cat', 'update-cat', 'delete-cat',
  'sign-upload',
  'get-locale', 'set-locale',
  'get-interests', 'set-interests', 'join-house',
  'toggle-reaction',
  'get-word-data',  // ← 추가
]);

export class CoreNullLayer {
  async handle(ctx) {
    const { action, ...rest } = ctx.payload || {};
    if (!ALLOWED_ACTIONS.has(action)) {
      return this._error(ctx, 'UNKNOWN_ACTION', `알 수 없는 action: ${action}`, false);
    }

    try {
      switch (action) {
        case 'get-word-data':   return await this.getWordData(ctx);
        case 'get-house':       return await this.getHouse(ctx);
        case 'update-house':    return await this.updateHouse(ctx);
        case 'create-cat':      return await this.createCategory(ctx);
        case 'update-cat':      return await this.updateCategory(ctx);
        case 'delete-cat':      return await this.deleteCategory(ctx);
        case 'sign-upload':     return await this.signUpload(ctx);
        case 'get-locale':      return await this.getLocale(ctx);
        case 'set-locale':      return await this.setLocale(ctx);
        case 'get-interests':   return await this.getInterests(ctx);
        case 'set-interests':   return await this.setInterests(ctx);
        case 'join-house':      return await this.joinHouse(ctx);
        case 'toggle-reaction': return await this.toggleReaction(ctx);
        default: return this._error(ctx, 'UNKNOWN_ACTION', `처리 불가 action: ${action}`, false);
      }
    } catch (err) {
      return this._error(ctx, 'LAYER_FAIL', err.message, true);
    }
  }

 // CoreNullLayer.js - getWordData 메서드 (수정)
async getWordData(ctx) {
  const { word, lang = 'vi' } = ctx.payload || {};

  if (!word) {
    return this._error(ctx, 'MISSING_PARAMS', 'word 필수', false);
  }

  // 1. 방언 사전(tp_translations)에서 표준어/방언 조회
  const { data: dialect, error: dialectErr } = await supabase
    .from('tp_translations')
    .select('*')
    .eq('standard_word', word)  // ✅ standard_vi → standard_word
    .single();

  if (dialectErr && dialectErr.code !== 'PGRST116') {
    return this._error(ctx, 'DB_FAIL', `방언 조회 실패: ${dialectErr.message}`, true);
  }

  // 2. 번역 로그(tb_trans_logs)에서 감정/위험/의도 조회
  const { data: log, error: logErr } = await supabase
    .from('tb_trans_logs')
    .select('emotion_score, risk_score, intent, standard_vi')
    .eq('standard_vi', word)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (logErr && logErr.code !== 'PGRST116') {
    return this._error(ctx, 'DB_FAIL', `로그 조회 실패: ${logErr.message}`, true);
  }

  // 3. 문화 충돌(tp_conflicts)에서 위험 단어 조회
  const { data: conflicts } = await supabase
    .from('tp_conflicts')
    .select('*')
    .eq('word', word);

  // 4. 응답 조립
  ctx.payload = {
    word,
    standard: dialect?.standard_word || word,        // ✅ standard_word
    southern: dialect?.southern_word || null,        // ✅ southern_word
    hue: dialect?.hue_word || null,                  // ✅ hue_word
    mekong: dialect?.mekong_word || null,            // ✅ mekong_word
    meaning: dialect?.meaning_ko || null,
    usage: log?.intent || null,
    examples: dialect?.example_northern
      ? [dialect.example_northern, dialect.example_southern].filter(Boolean)
      : [],
    riskScore: log?.risk_score || 0,
    culturalNote: conflicts?.length > 0
      ? conflicts.map(c => c.description).join('; ')
      : '문화적 맥락을 분석 중입니다.',
    emotion: log?.emotion_score !== undefined
      ? (log.emotion_score > 0.3 ? 'positive' : 'neutral')
      : 'neutral',
    relatedWords: dialect?.standard_word ? [dialect.standard_word] : [word],
  };

  return ctx;
}

  async getHouse(ctx) {
    const { slug, owner_key } = ctx.payload;
    if (!slug) return this._error(ctx, 'MISSING_PARAMS', 'slug 필수', false);
    let query = supabase.from('corenull_houses').select('*, rooms:corenull_rooms(*), milestones:corenull_milestones(*), categories:categories(*)').eq('slug', slug);
    if (owner_key) query = query.eq('owner_key', owner_key);
    const { data, error } = await query.single();
    if (error || !data) return this._error(ctx, 'NOT_FOUND', '하우스를 찾을 수 없습니다', false);
    return { ...ctx, payload: { house: data }, _error: null };
  }

  async updateHouse(ctx) {
    const { id, owner_key, ...patch } = ctx.payload;
    if (!id || !owner_key) return this._error(ctx, 'MISSING_PARAMS', 'id, owner_key 필수', false);
    const { data, error } = await supabase.from('corenull_houses').update(patch).eq('id', id).eq('owner_key', owner_key).select().single();
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { house: data }, _error: null };
  }

  async createCategory(ctx) {
    const { house_id, name, color, is_event, event_date } = ctx.payload;
    if (!house_id || !name) return this._error(ctx, 'MISSING_PARAMS', 'house_id, name 필수', false);
    const { data, error } = await supabase.from('categories').insert({ house_id, name, color: color || null, is_event: is_event || false, event_date: is_event ? event_date : null, created_at: new Date().toISOString() }).select().single();
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { category: data }, _error: null };
  }

  async updateCategory(ctx) {
    const { id, ...patch } = ctx.payload;
    if (!id) return this._error(ctx, 'MISSING_PARAMS', 'id 필수', false);
    const { data, error } = await supabase.from('categories').update(patch).eq('id', id).select().single();
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { category: data }, _error: null };
  }

  async deleteCategory(ctx) {
    const { id } = ctx.payload;
    if (!id) return this._error(ctx, 'MISSING_PARAMS', 'id 필수', false);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { deleted: id }, _error: null };
  }

  async signUpload(ctx) {
    const { upload_preset, folder } = ctx.payload;
    const timestamp = Math.round(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, upload_preset: upload_preset || 'brainpool', folder: folder || 'uploads' },
      process.env.CLOUDINARY_API_SECRET
    );
    return { ...ctx, payload: { signature, timestamp, cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY }, _error: null };
  }

  async getLocale(ctx) {
    const { device_id } = ctx.payload;
    if (!device_id) return this._error(ctx, 'MISSING_PARAMS', 'device_id 필수', false);
    const { data } = await supabase.from('core_users').select('vi_locale').eq('device_id', device_id).single();
    return { ...ctx, payload: { locale: data?.vi_locale || 'standard' }, _error: null };
  }

  async setLocale(ctx) {
    const { device_id, locale } = ctx.payload;
    if (!device_id || !locale) return this._error(ctx, 'MISSING_PARAMS', 'device_id, locale 필수', false);
    const { error } = await supabase.from('core_users').upsert({ device_id, vi_locale: locale, updated_at: new Date().toISOString() }, { onConflict: 'device_id' });
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { locale }, _error: null };
  }

  async getInterests(ctx) {
    const { data, error } = await supabase.from('corenull_interests').select('*').order('sort_order', { ascending: true });
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { interests: data || [] }, _error: null };
  }

  async setInterests(ctx) {
    const { device_id, interest_ids } = ctx.payload;
    if (!device_id || !Array.isArray(interest_ids)) return this._error(ctx, 'MISSING_PARAMS', 'device_id, interest_ids 배열 필수', false);
    const { error } = await supabase.from('core_users').upsert({ device_id, interest_ids, updated_at: new Date().toISOString() }, { onConflict: 'device_id' });
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { saved: true }, _error: null };
  }

  async joinHouse(ctx) {
    const { device_id, house_id } = ctx.payload;
    if (!device_id || !house_id) return this._error(ctx, 'MISSING_PARAMS', 'device_id, house_id 필수', false);
    const { error } = await supabase.from('corenull_house_members').upsert({ device_id, house_id, joined_at: new Date().toISOString() }, { onConflict: 'device_id,house_id' });
    if (error) return this._error(ctx, 'DB_FAIL', error.message, true);
    return { ...ctx, payload: { joined: true }, _error: null };
  }

  async toggleReaction(ctx) {
    const { message_id, device_id } = ctx.payload;
    if (!message_id || !device_id) return this._error(ctx, 'MISSING_PARAMS', 'message_id, device_id 필수', false);
    try {
      const { data: msg, error: fetchErr } = await supabase.from('messages').select('relations').eq('id', message_id).single();
      if (fetchErr) return this._error(ctx, 'DB_SELECT_FAIL', fetchErr.message, true);
      if (!msg) return this._error(ctx, 'NOT_FOUND', '메시지를 찾을 수 없음', false);
      const reactions = msg.relations?.reaction_ids || [];
      const already = reactions.includes(device_id);
      const newReactions = already ? reactions.filter(id => id !== device_id) : [...reactions, device_id];
      const { data: updated, error: updateErr } = await supabase.from('messages').update({ relations: { ...(msg.relations || {}), reaction_ids: newReactions } }).eq('id', message_id).select().single();
      if (updateErr) return this._error(ctx, 'DB_UPDATE_FAIL', updateErr.message, true);
      return { ...ctx, payload: { message: updated, reacted: !already, reaction_count: newReactions.length }, _error: null };
    } catch (err) {
      return this._error(ctx, 'LAYER_FAIL', err.message, true);
    }
  }

  _error(ctx, code, message, retryable) {
    return { ...ctx, _error: { code, message, retryable: !!retryable } };
  }
}