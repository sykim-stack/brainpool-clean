-- KIIP Stage 1 batch 2: 20 additional approved questions (ko UI)
-- Real newlines via E'...\n...' so context renders correctly without client normalize.

insert into public.kiip_questions
  (id, stage, type, topic_key, answer_option_id, difficulty, status, source, reviewed_at, reviewed_by)
values
  ('kiip1-intro-01', 1, 'response', 'introduction', 'b', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-intro-02', 1, 'meaning', 'introduction', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-greeting-03', 1, 'response', 'greeting', 'c', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-thanks-02', 1, 'response', 'thanks', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-apology-02', 1, 'meaning', 'apology', 'd', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-shopping-02', 1, 'response', 'shopping', 'b', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-shopping-03', 1, 'context', 'shopping', 'c', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-location-02', 1, 'context', 'location', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-location-03', 1, 'response', 'location', 'd', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-time-02', 1, 'meaning', 'time', 'b', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-time-03', 1, 'response', 'time', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-food-02', 1, 'context', 'food', 'b', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-food-03', 1, 'meaning', 'food', 'c', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-transport-02', 1, 'response', 'transport', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-number-01', 1, 'meaning', 'numbers', 'c', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-phone-01', 1, 'context', 'phone', 'b', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-help-01', 1, 'response', 'help', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-weather-01', 1, 'meaning', 'weather', 'd', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-family-01', 1, 'context', 'family', 'a', 'beginner', 'approved', 'manual', now(), 'batch2'),
  ('kiip1-daily-02', 1, 'response', 'daily-life', 'c', 'beginner', 'approved', 'manual', now(), 'batch2')
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
  (
    'kiip1-intro-01', 'ko', 'ko',
    '자기소개를 할 때 가장 자연스러운 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"몇 시예요?"},{"id":"b","text":"제 이름은 민수예요"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"맛있어요"}]',
    '이름을 말할 때는 “제 이름은 ~예요”라고 해요.',
    '제 이름은 ~예요'
  ),
  (
    'kiip1-intro-02', 'ko', 'vi',
    '“만나서 반갑습니다”와 가장 가까운 의미는 무엇인가요?',
    null,
    '[{"id":"a","text":"처음 만나 기쁩니다"},{"id":"b","text":"가격이 비쌉니다"},{"id":"c","text":"시간이 없습니다"},{"id":"d","text":"길이 멀어요"}]',
    '만나서 반갑습니다는 처음 만났을 때 쓰는 인사예요.',
    '만나서 반갑습니다 · Rất vui được gặp'
  ),
  (
    'kiip1-greeting-03', 'ko', 'ko',
    '아침에 이웃을 만났을 때 가장 자연스러운 인사는 무엇인가요?',
    null,
    '[{"id":"a","text":"잘 먹었습니다"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"안녕하세요"},{"id":"d","text":"어디 가요?"}]',
    '낮이나 아침에도 일상적으로 안녕하세요라고 인사할 수 있어요.',
    '안녕하세요'
  ),
  (
    'kiip1-thanks-02', 'ko', 'ko',
    '도움을 받은 뒤 하는 말로 가장 알맞은 것은 무엇인가요?',
    null,
    '[{"id":"a","text":"감사합니다"},{"id":"b","text":"실례합니다"},{"id":"c","text":"어서 오세요"},{"id":"d","text":"몇 시예요?"}]',
    '도움이나 선물을 받았을 때 감사합니다라고 말해요.',
    '감사합니다'
  ),
  (
    'kiip1-apology-02', 'ko', 'vi',
    '“죄송합니다”를 쓰는 상황은 무엇인가요?',
    null,
    '[{"id":"a","text":"음식을 주문할 때"},{"id":"b","text":"가격을 물을 때"},{"id":"c","text":"친구를 소개할 때"},{"id":"d","text":"실수해서 미안할 때"}]',
    '실수하거나 폐를 끼쳤을 때 죄송합니다 / 미안합니다를 써요.',
    '죄송합니다 · Xin lỗi'
  ),
  (
    'kiip1-shopping-02', 'ko', 'ko',
    '가게에서 가격을 묻고 싶을 때 뭐라고 말하나요?',
    null,
    '[{"id":"a","text":"이름이 뭐예요?"},{"id":"b","text":"이거 얼마예요?"},{"id":"c","text":"몇 시예요?"},{"id":"d","text":"어디 살아요?"}]',
    '가격을 물을 때는 “이거 얼마예요?”라고 해요.',
    '얼마예요?'
  ),
  (
    'kiip1-shopping-03', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이 티셔츠 있어요?\nB: 네, _____.',
    '[{"id":"a","text":"세 시예요"},{"id":"b","text":"맛있어요"},{"id":"c","text":"여기 있어요"},{"id":"d","text":"감사합니다"}]',
    '물건이 있을 때 “여기 있어요”라고 안내할 수 있어요.',
    '여기 있어요'
  ),
  (
    'kiip1-location-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 지하철역이 어디예요?\nB: _____ 있어요.',
    '[{"id":"a","text":"저쪽에"},{"id":"b","text":"삼천 원"},{"id":"c","text":"민수 씨"},{"id":"d","text":"잘 먹겠습니다"}]',
    '위치를 가리킬 때 “저쪽에 있어요”처럼 말해요.',
    '어디예요? · 저쪽에'
  ),
  (
    'kiip1-location-03', 'ko', 'ko',
    '길을 잃었을 때 가장 자연스러운 질문은 무엇인가요?',
    null,
    '[{"id":"a","text":"몇 살이에요?"},{"id":"b","text":"맛있어요?"},{"id":"c","text":"이름이 뭐예요?"},{"id":"d","text":"이 길이 맞아요?"}]',
    '길을 확인할 때 “이 길이 맞아요?”라고 물을 수 있어요.',
    '이 길이 맞아요?'
  ),
  (
    'kiip1-time-02', 'ko', 'vi',
    '“지금 몇 시예요?”는 무엇을 묻는 말인가요?',
    null,
    '[{"id":"a","text":"장소"},{"id":"b","text":"시간"},{"id":"c","text":"가격"},{"id":"d","text":"이름"}]',
    '몇 시예요?는 시간을 묻는 표현이에요.',
    '몇 시예요? · Mấy giờ?'
  ),
  (
    'kiip1-time-03', 'ko', 'ko',
    '약속 시간을 정할 때 가장 알맞은 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"내일 두 시에 만나요"},{"id":"b","text":"화장실이 어디예요?"},{"id":"c","text":"잘 먹었습니다"},{"id":"d","text":"얼마예요?"}]',
    '약속할 때는 “내일 두 시에 만나요”처럼 날짜와 시간을 말해요.',
    '만나요 · 두 시에'
  ),
  (
    'kiip1-food-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이거 매워요?\nB: 아니요, _____.',
    '[{"id":"a","text":"세 시예요"},{"id":"b","text":"안 매워요"},{"id":"c","text":"저쪽에 있어요"},{"id":"d","text":"제 이름이에요"}]',
    '매운지 물을 때 “안 매워요”로 대답할 수 있어요.',
    '매워요 · 안 매워요'
  ),
  (
    'kiip1-food-03', 'ko', 'ko',
    '식당에서 음식을 시킨 뒤 자주 듣는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"이름이 뭐예요?"},{"id":"b","text":"몇 시예요?"},{"id":"c","text":"조금만 기다려 주세요"},{"id":"d","text":"정류장이 어디예요?"}]',
    '주문이 들어간 뒤 “조금만 기다려 주세요”라고 안내하는 경우가 많아요.',
    '기다려 주세요'
  ),
  (
    'kiip1-transport-02', 'ko', 'ko',
    '택시를 탈 때 목적지를 말하는 가장 자연스러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"서울역으로 가 주세요"},{"id":"b","text":"감사합니다 맛있어요"},{"id":"c","text":"이름이 민수예요"},{"id":"d","text":"날씨가 좋아요"}]',
    '목적지 뒤에 “으로/로 가 주세요”를 붙여요.',
    '~로 가 주세요'
  ),
  (
    'kiip1-number-01', 'ko', 'ko',
    '“하나, 둘, 셋” 다음에 오는 수는 무엇인가요?',
    null,
    '[{"id":"a","text":"열"},{"id":"b","text":"일곱"},{"id":"c","text":"넷"},{"id":"d","text":"아홉"}]',
    '고유어 수사는 하나 둘 셋 넷 다섯… 순서로 이어져요.',
    '넷'
  ),
  (
    'kiip1-phone-01', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 전화번호가 어떻게 되세요?\nB: _____.',
    '[{"id":"a","text":"날씨가 좋아요"},{"id":"b","text":"010-1234-5678이에요"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"저쪽에 있어요"}]',
    '전화번호를 물을 때는 숫자로 대답해요.',
    '전화번호'
  ),
  (
    'kiip1-help-01', 'ko', 'ko',
    '도움이 필요할 때 가장 자연스러운 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"좀 도와주세요"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"잘 먹었습니다"},{"id":"d","text":"이름이 뭐예요?"}]',
    '도움이 필요하면 “좀 도와주세요”라고 말해요.',
    '도와주세요'
  ),
  (
    'kiip1-weather-01', 'ko', 'ko',
    '“비가 와요”는 무엇을 말하는 표현인가요?',
    null,
    '[{"id":"a","text":"배가 고프다"},{"id":"b","text":"시간이 늦다"},{"id":"c","text":"가격이 싸다"},{"id":"d","text":"날씨가 흐리고 비가 온다"}]',
    '비가 와요는 날씨, 특히 비가 오는 상황을 말해요.',
    '비가 와요'
  ),
  (
    'kiip1-family-01', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 가족이 몇 명이에요?\nB: _____ 있어요.',
    '[{"id":"a","text":"네 명"},{"id":"b","text":"세 시"},{"id":"c","text":"삼천 원"},{"id":"d","text":"저쪽"}]',
    '사람 수는 “명”으로 세요. “네 명 있어요.”',
    '몇 명이에요? · 명'
  ),
  (
    'kiip1-daily-02', 'ko', 'ko',
    '집에 들어가기 전에 벨을 누르고 하는 말로 알맞은 것은 무엇인가요?',
    null,
    '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"얼마예요?"},{"id":"c","text":"계세요?"},{"id":"d","text":"몇 시예요?"}]',
    '방문할 때 “계세요?”라고 확인할 수 있어요.',
    '계세요?'
  )
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
