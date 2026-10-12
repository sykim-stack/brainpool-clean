-- KIIP question bank: language-neutral question metadata + localized content
create table if not exists public.kiip_questions (
  id text primary key,
  stage smallint not null check (stage between 1 and 6),
  type text not null check (type in ('meaning', 'context', 'response')),
  topic_key text not null,
  answer_option_id text not null,
  difficulty text not null default 'beginner' check (difficulty in ('beginner', 'elementary', 'intermediate', 'advanced')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'archived')),
  source text not null default 'manual' check (source in ('manual', 'generated', 'imported')),
  version integer not null default 1 check (version > 0),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kiip_question_locales (
  question_id text not null references public.kiip_questions(id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  target_locale text not null default 'ko' check (target_locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  prompt text not null,
  context text,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  explanation text not null,
  vocabulary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (question_id, locale, target_locale)
);

create index if not exists kiip_questions_stage_status_idx
  on public.kiip_questions(stage, status, type);
create index if not exists kiip_question_locales_locale_idx
  on public.kiip_question_locales(locale, target_locale);

alter table public.kiip_questions enable row level security;
alter table public.kiip_question_locales enable row level security;

-- The application reads and writes these tables only through the server-side
-- service-role client. No anon/authenticated policy is intentionally exposed.

insert into public.kiip_questions
  (id, stage, type, topic_key, answer_option_id, difficulty, status, source, reviewed_at, reviewed_by)
values
  ('kiip1-greeting-01', 1, 'meaning', 'greeting', 'b', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-greeting-02', 1, 'response', 'greeting', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-thanks-01', 1, 'meaning', 'thanks', 'c', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-apology-01', 1, 'response', 'apology', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-shopping-01', 1, 'context', 'shopping', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-location-01', 1, 'meaning', 'location', 'c', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-time-01', 1, 'context', 'time', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-food-01', 1, 'response', 'food', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-transport-01', 1, 'meaning', 'transport', 'c', 'beginner', 'approved', 'manual', now(), 'user-verified'),
  ('kiip1-home-01', 1, 'context', 'daily-life', 'a', 'beginner', 'approved', 'manual', now(), 'user-verified')
on conflict (id) do update set
  stage = excluded.stage,
  type = excluded.type,
  topic_key = excluded.topic_key,
  answer_option_id = excluded.answer_option_id,
  difficulty = excluded.difficulty,
  status = excluded.status,
  reviewed_at = excluded.reviewed_at,
  reviewed_by = excluded.reviewed_by,
  updated_at = now();

insert into public.kiip_question_locales
  (question_id, locale, target_locale, prompt, context, options, explanation, vocabulary)
values
  ('kiip1-greeting-01', 'ko', 'vi', '“안녕하세요”와 가장 가까운 베트남어 표현은 무엇인가요?', null, '[{"id":"a","text":"Cảm ơn"},{"id":"b","text":"Xin chào"},{"id":"c","text":"Tạm biệt"},{"id":"d","text":"Xin lỗi"}]', 'Xin chào는 처음 만났거나 인사할 때 쓰는 표현이에요.', '안녕하세요 · Xin chào'),
  ('kiip1-greeting-02', 'ko', 'ko', '처음 만난 사람에게 가장 자연스러운 인사는 무엇인가요?', 'A: 처음 뵙겠습니다.\nB: _____.', '[{"id":"a","text":"안녕하세요"},{"id":"b","text":"괜찮아요"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"어서 오세요"}]', '처음 만난 사람에게는 안녕하세요 또는 처음 뵙겠습니다라고 인사해요.', '처음 뵙겠습니다'),
  ('kiip1-thanks-01', 'ko', 'vi', '“감사합니다”의 베트남어 표현은 무엇인가요?', null, '[{"id":"a","text":"Không sao"},{"id":"b","text":"Tạm biệt"},{"id":"c","text":"Cảm ơn"},{"id":"d","text":"Xin chào"}]', 'Cảm ơn은 고마움을 표현할 때 사용하는 말이에요.', '감사합니다 · Cảm ơn'),
  ('kiip1-apology-01', 'ko', 'vi', '길에서 다른 사람과 부딪혔을 때 가장 자연스러운 말은 무엇인가요?', null, '[{"id":"a","text":"미안합니다"},{"id":"b","text":"맛있게 드세요"},{"id":"c","text":"축하합니다"},{"id":"d","text":"다녀오세요"}]', '실수로 다른 사람에게 불편을 주었을 때 미안합니다라고 말해요.', '미안합니다 · Xin lỗi'),
  ('kiip1-shopping-01', 'ko', 'vi', '빈칸에 들어갈 표현을 고르세요.', 'A: 이 사과는 한 개에 얼마예요?\nB: _____원이에요.', '[{"id":"a","text":"삼천"},{"id":"b","text":"어디"},{"id":"c","text":"누구"},{"id":"d","text":"언제"}]', '가격을 말할 때는 한자어 수사와 원을 함께 사용해요. “삼천 원이에요”처럼 말할 수 있어요.', '얼마예요? · Bao nhiêu tiền?'),
  ('kiip1-location-01', 'ko', 'vi', '“화장실이 어디예요?”는 언제 사용하는 표현인가요?', null, '[{"id":"a","text":"가격을 물을 때"},{"id":"b","text":"시간을 물을 때"},{"id":"c","text":"장소를 물을 때"},{"id":"d","text":"이름을 물을 때"}]', '어디예요?는 장소나 위치를 물을 때 사용하는 표현이에요.', '어디예요? · Ở đâu?'),
  ('kiip1-time-01', 'ko', 'ko', '빈칸에 들어갈 표현을 고르세요.', 'A: 몇 시에 만날까요?\nB: _____ 만나요.', '[{"id":"a","text":"세 시에"},{"id":"b","text":"학교에서"},{"id":"c","text":"친구를"},{"id":"d","text":"맛있게"}]', '몇 시에?라는 질문에는 “세 시에”처럼 시간으로 대답해요.', '몇 시에 만날까요?'),
  ('kiip1-food-01', 'ko', 'ko', '식사를 시작하기 전에 하는 말은 무엇인가요?', null, '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"안녕히 가세요"},{"id":"c","text":"괜찮습니다"},{"id":"d","text":"어서 오세요"}]', '식사 전에 잘 먹겠습니다라고 말하고, 식사 후에는 잘 먹었습니다라고 말해요.', '잘 먹겠습니다'),
  ('kiip1-transport-01', 'ko', 'vi', '“버스 정류장이 어디예요?”의 핵심 질문은 무엇인가요?', null, '[{"id":"a","text":"버스의 가격"},{"id":"b","text":"버스의 시간"},{"id":"c","text":"버스 정류장의 위치"},{"id":"d","text":"버스의 색깔"}]', '어디예요?가 들어간 문장은 보통 위치나 장소를 묻는 말이에요.', '정류장 · Trạm xe buýt'),
  ('kiip1-home-01', 'ko', 'ko', '빈칸에 들어갈 가장 자연스러운 표현을 고르세요.', 'A: 오늘 날씨가 어때요?\nB: _____ 좋아요.', '[{"id":"a","text":"날씨가"},{"id":"b","text":"이름이"},{"id":"c","text":"주소가"},{"id":"d","text":"전화번호가"}]', '날씨에 대해 말할 때는 “날씨가 좋아요”라고 해요.', '날씨가 좋아요')
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
