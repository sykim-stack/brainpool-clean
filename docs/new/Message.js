/**
 * BRAINPOOL OS — Message 단일 구조 정의
 * ─────────────────────────────────────────────────────────────────
 * Master v1.0 §2 핵심 원칙:
 *   "시스템 전체는 단 하나의 핵심 단위(Message)를 기반으로 한다."
 *
 * Post, Comment, Chat, Event 는 별도 시스템이 아니라
 * 모두 Message(type=...) 이다.
 *
 * ─── 계약 (Master v1.0 §4) ───────────────────────────────────────
 * - (ctx) => ctx 형태 준수
 * - throw 금지 → _error 반환
 * - 불변성: 원본 객체 수정 금지
 * - traceId 항상 전파
 * ─────────────────────────────────────────────────────────────────
 */

'use strict';

// ── 타입 상수 ──────────────────────────────────────────────────────
export const MESSAGE_TYPE = Object.freeze({
  POST:    'post',
  COMMENT: 'comment',
  CHAT:    'chat',
  EVENT:   'event',
});

// ── 핵심 구조 정의 (JSDoc TypeDef) ────────────────────────────────
/**
 * @typedef {Object} Message
 * @property {string}        id          UUID
 * @property {MessageType}   type        'post' | 'comment' | 'chat' | 'event'
 * @property {string}        content     본문 텍스트
 * @property {MessageMeta}   meta        타입별 확장 데이터
 * @property {MessageRel}    relations   연관 관계
 * @property {string}        created_at  ISO 8601
 * @property {string}        [device_id] 작성자 식별자 (무로그인)
 * @property {string}        [house_id]  소속 하우스 ID
 */

/**
 * @typedef {Object} MessageMeta
 *
 * 공통
 * @property {string}   [emotion]       감정 태그
 * @property {number}   [emotion_score] CoreRing 감정 점수
 * @property {string[]} [media_urls]    이미지/영상 URL 배열
 *
 * type='chat' 전용
 * @property {string}   [room_id]       채팅방 UUID
 * @property {string}   [translated_ko] 한국어 번역 결과
 * @property {string}   [translated_vi] 베트남어 번역 결과
 * @property {string}   [source_lang]   감지된 원본 언어
 *
 * type='comment' 전용
 * @property {string}   [author_name]   방명록 작성자명
 * @property {string}   [photo_url]     방명록 사진 URL
 * @property {string}   [ai_translated] AI 번역 결과
 *
 * type='event' 전용
 * @property {string}   [event_date]    이벤트 날짜 (ISO 8601)
 * @property {string}   [category_id]   연결된 카테고리 UUID
 * @property {string}   [story_id]      생성된 스토리 UUID
 */

/**
 * @typedef {Object} MessageRel
 * @property {string}   [parent_id]     부모 Message UUID (comment → post)
 * @property {string[]} [category_ids]  분류 UUID 배열 (post)
 * @property {string[]} [reaction_ids]  반응한 device_id 배열
 */

// ── 팩토리 함수 ────────────────────────────────────────────────────

/**
 * Message 객체를 생성합니다.
 * 유효성 검사 실패 시 _error 를 포함한 null 을 반환합니다.
 *
 * @param {Partial<Message>} fields
 * @returns {Message | null}
 */
export function createMessage(fields = {}) {
  const { type, content } = fields;

  if (!Object.values(MESSAGE_TYPE).includes(type)) {
    return null; // _error 는 호출 측에서 ctx에 주입
  }
  if (typeof content !== 'string') {
    return null;
  }

  return {
    id:         fields.id         ?? crypto.randomUUID(),
    type,
    content,
    meta:       fields.meta       ?? {},
    relations:  fields.relations  ?? {},
    created_at: fields.created_at ?? new Date().toISOString(),
    device_id:  fields.device_id  ?? null,
    house_id:   fields.house_id   ?? null,
  };
}

// ── 타입 가드 ──────────────────────────────────────────────────────

/** @param {unknown} v @returns {v is Message} */
export function isMessage(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    typeof v.id === 'string' &&
    Object.values(MESSAGE_TYPE).includes(v.type) &&
    typeof v.content === 'string'
  );
}

// ── 레거시 → Message 변환 헬퍼 ────────────────────────────────────
// 마이그레이션 기간 동안만 사용. 완료 후 제거.

/**
 * 기존 Post 객체를 Message(type='post')로 변환합니다.
 * @param {Object} post  레거시 post 객체
 * @returns {Message}
 */
export function fromPost(post) {
  return createMessage({
    id:        post.id,
    type:      MESSAGE_TYPE.POST,
    content:   post.content ?? post.text ?? '',
    meta: {
      emotion:       post.emotion_tag ?? null,
      emotion_score: post.emotion_score ?? null,
      media_urls:    post.image_urls ?? [],
    },
    relations: {
      category_ids: post.category_ids ?? [],
      reaction_ids: post.reaction_ids ?? [],
    },
    created_at: post.created_at,
    device_id:  post.device_id ?? null,
    house_id:   post.house_id  ?? null,
  });
}

/**
 * 기존 Comment/방명록 객체를 Message(type='comment')로 변환합니다.
 * @param {Object} comment  레거시 comment 객체
 * @returns {Message}
 */
export function fromComment(comment) {
  return createMessage({
    id:      comment.id,
    type:    MESSAGE_TYPE.COMMENT,
    content: comment.content ?? '',
    meta: {
      author_name:   comment.author_name  ?? null,
      photo_url:     comment.photo_url    ?? null,
      ai_translated: comment.translated   ?? null,
    },
    relations: {
      parent_id: comment.post_id ?? comment.parent_id ?? null,
    },
    created_at: comment.created_at,
    device_id:  comment.device_id ?? null,
    house_id:   comment.house_id  ?? null,
  });
}

/**
 * 기존 chat_messages 행을 Message(type='chat')로 변환합니다.
 * @param {Object} row  Supabase chat_messages 행
 * @returns {Message}
 */
export function fromChatRow(row) {
  return createMessage({
    id:      row.id,
    type:    MESSAGE_TYPE.CHAT,
    content: row.message ?? row.original ?? '',
    meta: {
      room_id:       row.room_id      ?? null,
      translated_ko: row.translated_ko ?? null,
      translated_vi: row.translated_vi ?? null,
      source_lang:   row.detected_lang ?? null,
    },
    relations: {},
    created_at: row.created_at,
    device_id:  row.sender_id ?? null,
  });
}

/**
 * 이벤트 카테고리 포스트를 Message(type='event')로 변환합니다.
 * @param {Object} post      레거시 post (카테고리 is_event=true)
 * @param {Object} category  연결된 category 객체
 * @returns {Message}
 */
export function fromEvent(post, category = {}) {
  return createMessage({
    id:      post.id,
    type:    MESSAGE_TYPE.EVENT,
    content: post.content ?? '',
    meta: {
      emotion:       post.emotion_tag  ?? null,
      media_urls:    post.image_urls   ?? [],
      event_date:    category.event_date ?? null,
      category_id:   category.id       ?? null,
    },
    relations: {
      category_ids: [category.id].filter(Boolean),
      reaction_ids: post.reaction_ids ?? [],
    },
    created_at: post.created_at,
    device_id:  post.device_id ?? null,
    house_id:   post.house_id  ?? null,
  });
}