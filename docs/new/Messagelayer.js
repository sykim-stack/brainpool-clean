/**
 * BRAINPOOL OS — MessageLayer
 * ─────────────────────────────────────────────────────────────────
 * 모든 Message CRUD 의 단일 진입점.
 * Post / Comment / Chat / Event 는 이 레이어를 통해서만 처리한다.
 *
 * Master v1.0 §3: "Message → ALL behaviors (create, update, delete, react)"
 *
 * ─── 계약 ────────────────────────────────────────────────────────
 * - 모든 메서드는 (ctx) => ctx 형태
 * - throw 금지 → { ...ctx, _error: '...' } 반환
 * - traceId 항상 전파
 * - UUID 컬럼 타입 사전 확인 완료 (Supabase messages 테이블)
 * ─────────────────────────────────────────────────────────────────
 *
 * Supabase 테이블: messages
 * ┌────────────────┬──────────────────────────────────────────┐
 * │ 컬럼           │ 타입                                      │
 * ├────────────────┼──────────────────────────────────────────┤
 * │ id             │ uuid  PRIMARY KEY DEFAULT gen_random_uuid │
 * │ type           │ text  CHECK (type IN ('post','comment',   │
 * │                │       'chat','event'))                    │
 * │ content        │ text  NOT NULL                            │
 * │ meta           │ jsonb DEFAULT '{}'                        │
 * │ relations      │ jsonb DEFAULT '{}'                        │
 * │ created_at     │ timestamptz DEFAULT now()                 │
 * │ device_id      │ text                                      │
 * │ house_id       │ uuid  REFERENCES corenull_houses(id)      │
 * └────────────────┴──────────────────────────────────────────┘
 */

'use strict';

import { createMessage, isMessage, MESSAGE_TYPE } from './message.js';

// ── Supabase 클라이언트 (환경 주입) ────────────────────────────────
function _getSupabase() {
  // Next.js 서버 환경: @supabase/supabase-js
  // 브라우저 환경: window.supabase (CDN 로드)
  if (typeof window !== 'undefined' && window.__supabase) return window.__supabase;
  throw new Error('[MessageLayer] Supabase 클라이언트가 초기화되지 않았습니다.');
}

// ── 공통 헬퍼 ──────────────────────────────────────────────────────
function _err(ctx, code, message) {
  return { ...ctx, _error: { code, message, retryable: false } };
}
function _ok(ctx, data) {
  return { ...ctx, payload: { ...ctx.payload, ...data }, _error: null };
}

// ── MessageLayer ────────────────────────────────────────────────────
export class MessageLayer {

  // ── CREATE ────────────────────────────────────────────────────────

  /**
   * 새 Message를 생성합니다.
   *
   * ctx.payload 예시:
   * {
   *   type:      'post',
   *   content:   '안녕하세요',
   *   meta:      { emotion: 'happy', media_urls: [] },
   *   relations: { category_ids: ['uuid-...'] },
   *   house_id:  'uuid-...',
   *   device_id: 'device-...',
   * }
   *
   * @param {Object} ctx
   * @returns {Object} ctx with payload.message = 저장된 Message
   */
  async create(ctx) {
    const { type, content, meta, relations, house_id, device_id } = ctx.payload;

    const msg = createMessage({ type, content, meta, relations, house_id, device_id });
    if (!msg) {
      return _err(ctx, 'MESSAGE_INVALID', `유효하지 않은 Message 타입 또는 content: type=${type}`);
    }

    try {
      const sb = _getSupabase();
      const { data, error } = await sb
        .from('messages')
        .insert({
          id:         msg.id,
          type:       msg.type,
          content:    msg.content,
          meta:       msg.meta,
          relations:  msg.relations,
          created_at: msg.created_at,
          device_id:  msg.device_id,
          house_id:   msg.house_id,
        })
        .select()
        .single();

      if (error) return _err(ctx, 'DB_INSERT_FAIL', error.message);
      return _ok(ctx, { message: data });
    } catch (e) {
      return _err(ctx, 'MESSAGE_CREATE_FAIL', e.message);
    }
  }

  // ── READ (단건) ───────────────────────────────────────────────────

  /**
   * @param {Object} ctx  ctx.payload.id 필수
   */
  async get(ctx) {
    const { id } = ctx.payload;
    if (!id) return _err(ctx, 'MISSING_ID', 'id 가 필요합니다.');

    try {
      const sb = _getSupabase();
      const { data, error } = await sb
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return _err(ctx, 'DB_SELECT_FAIL', error.message);
      if (!data)  return _err(ctx, 'NOT_FOUND', `Message id=${id} 를 찾을 수 없습니다.`);
      return _ok(ctx, { message: data });
    } catch (e) {
      return _err(ctx, 'MESSAGE_GET_FAIL', e.message);
    }
  }

  // ── READ (목록) ───────────────────────────────────────────────────

  /**
   * 조건에 맞는 Message 목록을 반환합니다.
   *
   * ctx.payload 예시:
   * {
   *   type:     'post',          // 선택
   *   house_id: 'uuid-...',      // 선택
   *   parent_id: 'uuid-...',     // comment 필터 (relations->>'parent_id')
   *   room_id:  'uuid-...',      // chat 필터 (meta->>'room_id')
   *   limit:    50,              // 기본 50
   *   cursor:   'ISO-timestamp', // 페이지네이션
   * }
   */
  async list(ctx) {
    const {
      type, house_id, parent_id, room_id,
      limit = 50, cursor,
    } = ctx.payload;

    try {
      const sb = _getSupabase();
      let q = sb.from('messages').select('*').order('created_at', { ascending: false }).limit(limit);

      if (type)      q = q.eq('type', type);
      if (house_id)  q = q.eq('house_id', house_id);
      if (parent_id) q = q.eq('relations->>parent_id', parent_id);
      if (room_id)   q = q.eq('meta->>room_id', room_id);
      if (cursor)    q = q.lt('created_at', cursor);

      const { data, error } = await q;
      if (error) return _err(ctx, 'DB_SELECT_FAIL', error.message);
      return _ok(ctx, { messages: data ?? [] });
    } catch (e) {
      return _err(ctx, 'MESSAGE_LIST_FAIL', e.message);
    }
  }

  // ── UPDATE ────────────────────────────────────────────────────────

  /**
   * ctx.payload: { id, content?, meta?, relations? }
   */
  async update(ctx) {
    const { id, content, meta, relations } = ctx.payload;
    if (!id) return _err(ctx, 'MISSING_ID', 'id 가 필요합니다.');

    const patch = {};
    if (content   !== undefined) patch.content   = content;
    if (meta      !== undefined) patch.meta       = meta;
    if (relations !== undefined) patch.relations  = relations;

    if (Object.keys(patch).length === 0) {
      return _err(ctx, 'NOTHING_TO_UPDATE', '변경할 필드가 없습니다.');
    }

    try {
      const sb = _getSupabase();
      const { data, error } = await sb
        .from('messages')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) return _err(ctx, 'DB_UPDATE_FAIL', error.message);
      return _ok(ctx, { message: data });
    } catch (e) {
      return _err(ctx, 'MESSAGE_UPDATE_FAIL', e.message);
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────

  /**
   * ctx.payload: { id, device_id }  (device_id = 소유권 확인)
   */
  async delete(ctx) {
    const { id, device_id } = ctx.payload;
    if (!id) return _err(ctx, 'MISSING_ID', 'id 가 필요합니다.');

    try {
      const sb = _getSupabase();

      // 소유권 확인
      const { data: existing } = await sb
        .from('messages').select('device_id').eq('id', id).single();

      if (existing && existing.device_id && existing.device_id !== device_id) {
        return _err(ctx, 'UNAUTHORIZED', '삭제 권한이 없습니다.');
      }

      const { error } = await sb.from('messages').delete().eq('id', id);
      if (error) return _err(ctx, 'DB_DELETE_FAIL', error.message);
      return _ok(ctx, { deleted: id });
    } catch (e) {
      return _err(ctx, 'MESSAGE_DELETE_FAIL', e.message);
    }
  }

  // ── REACT (좋아요 토글) ────────────────────────────────────────────

  /**
   * ctx.payload: { id, device_id }
   * relations.reaction_ids 배열에 device_id 토글
   */
  async react(ctx) {
    const { id, device_id } = ctx.payload;
    if (!id || !device_id) {
      return _err(ctx, 'MISSING_PARAMS', 'id 와 device_id 가 필요합니다.');
    }

    try {
      const sb = _getSupabase();

      // 현재 reactions 로드
      const { data: existing, error: selErr } = await sb
        .from('messages').select('relations').eq('id', id).single();
      if (selErr) return _err(ctx, 'DB_SELECT_FAIL', selErr.message);

      const reactions = existing?.relations?.reaction_ids ?? [];
      const already   = reactions.includes(device_id);
      const updated   = already
        ? reactions.filter(d => d !== device_id)
        : [...reactions, device_id];

      const { data, error: updErr } = await sb
        .from('messages')
        .update({ relations: { ...existing.relations, reaction_ids: updated } })
        .eq('id', id)
        .select()
        .single();

      if (updErr) return _err(ctx, 'DB_UPDATE_FAIL', updErr.message);
      return _ok(ctx, { message: data, reacted: !already });
    } catch (e) {
      return _err(ctx, 'MESSAGE_REACT_FAIL', e.message);
    }
  }
}

export const messageLayer = new MessageLayer();