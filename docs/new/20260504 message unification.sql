-- ═══════════════════════════════════════════════════════════════════
-- BRAINPOOL OS — Message 단일 구조 마이그레이션
-- 버전: v1.1
-- 날짜: 2026-05-04
-- ═══════════════════════════════════════════════════════════════════
--
-- 실행 순서:
--   1. messages 테이블 생성
--   2. 기존 데이터 이관 (posts → messages, comments → messages 등)
--   3. 기존 테이블 deprecated 처리 (즉시 삭제 금지 — 6주 유예)
--
-- ⚠️  Supabase 대시보드 > SQL Editor 에서 실행
--     커스텀 스키마 사용 시 search_path 확인 필수
-- ═══════════════════════════════════════════════════════════════════


-- ── STEP 1: messages 테이블 생성 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL
                          CHECK (type IN ('post', 'comment', 'chat', 'event')),
  content     TEXT        NOT NULL DEFAULT '',
  meta        JSONB       NOT NULL DEFAULT '{}',
  relations   JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id   TEXT,
  house_id    UUID        REFERENCES corenull_houses(id) ON DELETE SET NULL
);

-- 인덱스 (자주 쿼리하는 패턴 기반)
CREATE INDEX IF NOT EXISTS idx_messages_type       ON messages (type);
CREATE INDEX IF NOT EXISTS idx_messages_house_id   ON messages (house_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_device_id  ON messages (device_id);

-- meta.room_id 로 chat 필터링
CREATE INDEX IF NOT EXISTS idx_messages_meta_room_id
  ON messages ((meta->>'room_id'))
  WHERE type = 'chat';

-- relations.parent_id 로 comment 필터링
CREATE INDEX IF NOT EXISTS idx_messages_relations_parent_id
  ON messages ((relations->>'parent_id'))
  WHERE type = 'comment';

COMMENT ON TABLE  messages             IS 'BRAINPOOL 단일 Message 구조. post/comment/chat/event 통합.';
COMMENT ON COLUMN messages.type        IS '''post'' | ''comment'' | ''chat'' | ''event''';
COMMENT ON COLUMN messages.meta        IS '타입별 확장 데이터 (JSON). chat: room_id,translated_ko/vi. comment: author_name. event: event_date,category_id.';
COMMENT ON COLUMN messages.relations   IS '연관 관계 (JSON). parent_id, category_ids, reaction_ids.';


-- ── STEP 2: 기존 데이터 이관 ─────────────────────────────────────
-- 아래 구문은 기존 테이블이 존재할 때만 실행하세요.
-- 각 INSERT 전에 테이블 존재 여부를 확인하세요.

-- 2-A. posts → messages (type='post' 또는 type='event')
INSERT INTO messages (id, type, content, meta, relations, created_at, device_id, house_id)
SELECT
  p.id,
  CASE WHEN c.is_event = TRUE THEN 'event' ELSE 'post' END AS type,
  COALESCE(p.content, '') AS content,
  jsonb_build_object(
    'emotion',       p.emotion_tag,
    'emotion_score', p.emotion_score,
    'media_urls',    COALESCE(p.image_urls, '[]'::jsonb),
    'event_date',    c.event_date,
    'category_id',   c.id
  ) AS meta,
  jsonb_build_object(
    'category_ids',  COALESCE(p.category_ids, '[]'::jsonb),
    'reaction_ids',  COALESCE(p.reaction_ids, '[]'::jsonb)
  ) AS relations,
  p.created_at,
  p.device_id,
  p.house_id
FROM posts p
LEFT JOIN categories c ON c.id = ANY(
  ARRAY(SELECT jsonb_array_elements_text(p.category_ids))::uuid[]
)
ON CONFLICT (id) DO NOTHING;

-- 2-B. comments (방명록 포함) → messages (type='comment')
INSERT INTO messages (id, type, content, meta, relations, created_at, device_id, house_id)
SELECT
  id,
  'comment' AS type,
  COALESCE(content, '') AS content,
  jsonb_build_object(
    'author_name',   author_name,
    'photo_url',     photo_url,
    'ai_translated', translated
  ) AS meta,
  jsonb_build_object(
    'parent_id', post_id
  ) AS relations,
  created_at,
  device_id,
  house_id
FROM comments
ON CONFLICT (id) DO NOTHING;

-- 2-C. chat_messages → messages (type='chat')
INSERT INTO messages (id, type, content, meta, relations, created_at, device_id, house_id)
SELECT
  id,
  'chat' AS type,
  COALESCE(message, original, '') AS content,
  jsonb_build_object(
    'room_id',       room_id,
    'translated_ko', translated_ko,
    'translated_vi', translated_vi,
    'source_lang',   detected_lang
  ) AS meta,
  '{}'::jsonb AS relations,
  created_at,
  sender_id AS device_id,
  NULL AS house_id
FROM chat_messages
ON CONFLICT (id) DO NOTHING;


-- ── STEP 3: 기존 테이블 deprecated 처리 ─────────────────────────
-- 즉시 DROP 금지. 6주 유예 후 삭제.
-- 아래 COMMENT 로 폐기 예정 명시.

COMMENT ON TABLE posts
  IS '[DEPRECATED 2026-05-04] messages 테이블로 이관 완료. 2026-06-16 삭제 예정.';

COMMENT ON TABLE comments
  IS '[DEPRECATED 2026-05-04] messages 테이블로 이관 완료. 2026-06-16 삭제 예정.';

COMMENT ON TABLE chat_messages
  IS '[DEPRECATED 2026-05-04] messages 테이블로 이관 완료. 2026-06-16 삭제 예정.';


-- ── STEP 4: RLS 정책 (무로그인 device_id 기반) ────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 사용자 허용
CREATE POLICY "messages_select_all"
  ON messages FOR SELECT USING (true);

-- 쓰기: device_id 소유자만
CREATE POLICY "messages_insert_own"
  ON messages FOR INSERT
  WITH CHECK (device_id = current_setting('request.headers')::json->>'x-device-id');

CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  USING (device_id = current_setting('request.headers')::json->>'x-device-id');

CREATE POLICY "messages_delete_own"
  ON messages FOR DELETE
  USING (device_id = current_setting('request.headers')::json->>'x-device-id');


-- ── 검증 쿼리 ────────────────────────────────────────────────────
-- 마이그레이션 후 아래 쿼리로 타입별 건수를 확인하세요.
SELECT type, COUNT(*) as count FROM messages GROUP BY type ORDER BY type;