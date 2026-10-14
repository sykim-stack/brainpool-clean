-- KIIP Stage 2 batch 1: 20 approved questions (초급 2 · 일상 대화)
-- Topics: shopping, transport, appointment, phone, health, feelings, daily-life

insert into public.kiip_questions
  (id, stage, type, topic_key, answer_option_id, difficulty, status, source, reviewed_at, reviewed_by)
values
  ('kiip2-shop-01', 2, 'response', 'shopping', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-shop-02', 2, 'context', 'shopping', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-shop-03', 2, 'meaning', 'shopping', 'c', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-trans-01', 2, 'response', 'transport', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-trans-02', 2, 'context', 'transport', 'd', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-trans-03', 2, 'meaning', 'transport', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-appt-01', 2, 'response', 'appointment', 'c', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-appt-02', 2, 'context', 'appointment', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-phone-01', 2, 'response', 'phone', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-phone-02', 2, 'context', 'phone', 'c', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-health-01', 2, 'response', 'health', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-health-02', 2, 'meaning', 'health', 'd', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-feel-01', 2, 'meaning', 'feelings', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-feel-02', 2, 'response', 'feelings', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-daily-01', 2, 'context', 'daily-life', 'c', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-daily-02', 2, 'response', 'daily-life', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-req-01', 2, 'response', 'request', 'a', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-req-02', 2, 'context', 'request', 'd', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-weather-01', 2, 'meaning', 'weather', 'c', 'elementary', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip2-hobby-01', 2, 'response', 'hobby', 'b', 'elementary', 'approved', 'generated', now(), 'hermes-batch1')
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
    'kiip2-shop-01', 'ko', 'ko',
    '가게에서 더 싼 물건을 찾고 싶을 때 뭐라고 말하나요?',
    null,
    '[{"id":"a","text":"이거 매워요?"},{"id":"b","text":"더 싼 거 있어요?"},{"id":"c","text":"몇 시예요?"},{"id":"d","text":"이름이 뭐예요?"}]',
    '가격을 비교하거나 더 저렴한 물건을 찾을 때 “더 싼 거 있어요?”라고 해요.',
    '더 싼 거 있어요?'
  ),
  (
    'kiip2-shop-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이 바지 한번 입어 봐도 돼요?\nB: 네, _____.',
    '[{"id":"a","text":"입어 보세요"},{"id":"b","text":"세 시예요"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"저쪽에 있어요"}]',
    '옷을 입어 보고 싶을 때 “입어 봐도 돼요?”라고 묻고, 가게에서는 “입어 보세요”라고 답해요.',
    '입어 봐도 돼요?'
  ),
  (
    'kiip2-shop-03', 'ko', 'ko',
    '“할인해요?”는 무엇을 묻는 말인가요?',
    null,
    '[{"id":"a","text":"영업 시간"},{"id":"b","text":"물건의 색"},{"id":"c","text":"가격이 내려가는지"},{"id":"d","text":"가게 위치"}]',
    '할인해요?는 세일이나 가격 할인이 있는지 물을 때 쓰는 표현이에요.',
    '할인해요?'
  ),
  (
    'kiip2-trans-01', 'ko', 'ko',
    '버스를 잘못 탔을 때 기사님께 할 수 있는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"여기서 내려 주세요"},{"id":"b","text":"맛있어요"},{"id":"c","text":"제 이름은 민수예요"},{"id":"d","text":"날씨가 좋아요"}]',
    '내리고 싶을 때 “여기서 내려 주세요”라고 말해요.',
    '내려 주세요'
  ),
  (
    'kiip2-trans-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 서울역까지 얼마나 걸려요?\nB: _____ 걸려요.',
    '[{"id":"a","text":"삼천 원"},{"id":"b","text":"네 명"},{"id":"c","text":"저쪽에"},{"id":"d","text":"삼십 분"}]',
    '시간을 물을 때 “얼마나 걸려요?”라고 하고, “삼십 분 걸려요”처럼 대답해요.',
    '얼마나 걸려요?'
  ),
  (
    'kiip2-trans-03', 'ko', 'ko',
    '“환승해요”는 어떤 상황에서 쓰는 말인가요?',
    null,
    '[{"id":"a","text":"음식을 주문할 때"},{"id":"b","text":"지하철이나 버스를 갈아탈 때"},{"id":"c","text":"가격을 물을 때"},{"id":"d","text":"인사를 할 때"}]',
    '환승은 다른 노선이나 교통수단으로 갈아타는 것을 말해요.',
    '환승해요'
  ),
  (
    'kiip2-appt-01', 'ko', 'ko',
    '약속을 미루고 싶을 때 가장 자연스러운 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"잘 먹었습니다"},{"id":"b","text":"얼마예요?"},{"id":"c","text":"오늘 좀 어려울 것 같아요"},{"id":"d","text":"여기 있어요"}]',
    '약속을 바꾸거나 미룰 때 “오늘 좀 어려울 것 같아요”처럼 부드럽게 말해요.',
    '어려울 것 같아요'
  ),
  (
    'kiip2-appt-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 내일 만날 수 있어요?\nB: 네, _____.',
    '[{"id":"a","text":"좋아요. 몇 시에 만날까요?"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"안 매워요"},{"id":"d","text":"정류장이 어디예요?"}]',
    '만날 수 있다고 대답한 뒤 시간을 다시 확인하는 것이 자연스러워요.',
    '만날 수 있어요?'
  ),
  (
    'kiip2-phone-01', 'ko', 'ko',
    '전화가 왔을 때 가장 먼저 하는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"여보세요"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"날씨가 좋아요"}]',
    '전화를 받을 때 “여보세요”라고 해요.',
    '여보세요'
  ),
  (
    'kiip2-phone-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 민수 씨 계세요?\nB: 지금 _____. 나중에 다시 전화해 주세요.',
    '[{"id":"a","text":"맛있어요"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"안 계세요"},{"id":"d","text":"저쪽에 있어요"}]',
    '자리에 없을 때 “안 계세요”라고 전하고, 나중에 다시 연락하라고 안내해요.',
    '안 계세요 · 다시 전화해 주세요'
  ),
  (
    'kiip2-health-01', 'ko', 'ko',
    '머리가 아플 때 약국이나 병원에서 할 수 있는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"머리가 아파요"},{"id":"b","text":"몇 시예요?"},{"id":"c","text":"이름이 뭐예요?"},{"id":"d","text":"할인해요?"}]',
    '증상을 말할 때 “머리가 아파요”, “배가 아파요”처럼 말해요.',
    '머리가 아파요'
  ),
  (
    'kiip2-health-02', 'ko', 'ko',
    '“약 먹었어요?”는 무엇을 묻는 말인가요?',
    null,
    '[{"id":"a","text":"식사 여부"},{"id":"b","text":"약속 시간"},{"id":"c","text":"가게 위치"},{"id":"d","text":"약을 복용했는지"}]',
    '약을 먹었는지 확인할 때 쓰는 표현이에요.',
    '약 먹었어요?'
  ),
  (
    'kiip2-feel-01', 'ko', 'ko',
    '“피곤해요”는 어떤 기분인가요?',
    null,
    '[{"id":"a","text":"배가 고프다"},{"id":"b","text":"몸이 지치고 힘이 없다"},{"id":"c","text":"기쁘다"},{"id":"d","text":"배가 부르다"}]',
    '피곤해요는 몸이나 마음이 지쳤을 때 쓰는 표현이에요.',
    '피곤해요'
  ),
  (
    'kiip2-feel-02', 'ko', 'ko',
    '시험에 합격했을 때 가장 자연스러운 기분을 나타내는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"정말 기뻐요"},{"id":"b","text":"배가 고파요"},{"id":"c","text":"미안합니다"},{"id":"d","text":"얼마예요?"}]',
    '좋은 일이 생겼을 때 “정말 기뻐요”, “행복해요”라고 말해요.',
    '기뻐요'
  ),
  (
    'kiip2-daily-01', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 주말에 뭐 해요?\nB: 보통 _____ 쉬어요.',
    '[{"id":"a","text":"삼천 원"},{"id":"b","text":"세 시"},{"id":"c","text":"집에서"},{"id":"d","text":"네 명"}]',
    '주말에 하는 일을 말할 때 “집에서 쉬어요”처럼 장소와 활동을 함께 말해요.',
    '주말에 뭐 해요?'
  ),
  (
    'kiip2-daily-02', 'ko', 'ko',
    '아침에 일어나서 하는 일을 말할 때 알맞은 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"할인해요?"},{"id":"b","text":"세수를 해요"},{"id":"c","text":"환승해요"},{"id":"d","text":"여보세요"}]',
    '세수하다, 양치하다, 아침을 먹다 등은 아침 일과를 말할 때 자주 써요.',
    '세수를 해요'
  ),
  (
    'kiip2-req-01', 'ko', 'ko',
    '창문을 열어 달라고 부탁할 때 가장 공손한 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"창문 좀 열어 주시겠어요?"},{"id":"b","text":"창문 열어"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"잘 먹었습니다"}]',
    '부탁할 때 “~아/어 주시겠어요?”를 쓰면 더 공손해요.',
    '열어 주시겠어요?'
  ),
  (
    'kiip2-req-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 사진 좀 찍어 주세요.\nB: 네, _____.',
    '[{"id":"a","text":"삼천 원이에요"},{"id":"b","text":"머리가 아파요"},{"id":"c","text":"여보세요"},{"id":"d","text":"여기 서 주세요"}]',
    '사진을 찍어 줄 때 위치를 안내하며 “여기 서 주세요”라고 할 수 있어요.',
    '찍어 주세요'
  ),
  (
    'kiip2-weather-01', 'ko', 'ko',
    '“날씨가 추워요”는 어떤 날씨를 말하나요?',
    null,
    '[{"id":"a","text":"더운 날"},{"id":"b","text":"비 오는 날"},{"id":"c","text":"기온이 낮은 날"},{"id":"d","text":"바람 없는 날"}]',
    '추워요는 기온이 낮아서 춥다는 뜻이에요. 반대로 더우면 “더워요”라고 해요.',
    '추워요 · 더워요'
  ),
  (
    'kiip2-hobby-01', 'ko', 'ko',
    '취미를 물을 때 가장 자연스러운 질문은 무엇인가요?',
    null,
    '[{"id":"a","text":"이거 얼마예요?"},{"id":"b","text":"취미가 뭐예요?"},{"id":"c","text":"몇 시예요?"},{"id":"d","text":"어디 살아요?"}]',
    '취미를 물을 때 “취미가 뭐예요?”라고 해요. 대답은 “영화 보는 거 좋아해요”처럼 할 수 있어요.',
    '취미가 뭐예요?'
  )
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
