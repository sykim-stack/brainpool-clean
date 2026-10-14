-- KIIP Stage 4 batch 1: 20 approved questions (중급 2 · 심화 표현)
-- Topics: opinion, emotion, complex situation, contrast, cause, suggestion

insert into public.kiip_questions
  (id, stage, type, topic_key, answer_option_id, difficulty, status, source, reviewed_at, reviewed_by)
values
  ('kiip4-opin-01', 4, 'response', 'opinion', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-opin-02', 4, 'context', 'opinion', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-opin-03', 4, 'meaning', 'opinion', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-emo-01', 4, 'response', 'emotion', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-emo-02', 4, 'meaning', 'emotion', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-cause-01', 4, 'context', 'cause', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-cause-02', 4, 'response', 'cause', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-contr-01', 4, 'context', 'contrast', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-contr-02', 4, 'meaning', 'contrast', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-sugg-01', 4, 'response', 'suggestion', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-sugg-02', 4, 'context', 'suggestion', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-reg-01', 4, 'meaning', 'regret', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-reg-02', 4, 'response', 'regret', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-comp-01', 4, 'context', 'complex', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-comp-02', 4, 'response', 'complex', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-news-01', 4, 'meaning', 'news', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-news-02', 4, 'response', 'news', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-rel-01', 4, 'context', 'relationship', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-plan-01', 4, 'response', 'plan', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip4-plan-02', 4, 'meaning', 'plan', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1')
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
    'kiip4-opin-01', 'ko', 'ko',
    '상대 의견에 부분적으로 동의할 때 자연스러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"완전 틀렸어요"},{"id":"b","text":"일리는 있지만 다른 면도 있는 것 같아요"},{"id":"c","text":"여보세요"},{"id":"d","text":"얼마예요?"}]',
    '완전히 반대하지 않으면서 의견을 덧붙일 때 “일리는 있지만…”을 써요.',
    '일리는 있지만'
  ),
  (
    'kiip4-opin-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이 정책에 대해 어떻게 생각하세요?\nB: _____ 신중하게 검토해야 할 문제라고 봅니다.',
    '[{"id":"a","text":"개인적으로는"},{"id":"b","text":"삼천 원"},{"id":"c","text":"머리가 아파요"},{"id":"d","text":"환승해요"}]',
    '의견을 말할 때 “개인적으로는 ~라고 봅니다”처럼 부드럽게 표현해요.',
    '개인적으로는 · ~라고 봅니다'
  ),
  (
    'kiip4-opin-03', 'ko', 'ko',
    '“반대합니다”보다 더 부드러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"절대 안 됩니다"},{"id":"b","text":"말도 안 돼요"},{"id":"c","text":"조금 다른 의견인데요"},{"id":"d","text":"틀렸어요"}]',
    '직접적인 반대 대신 “조금 다른 의견인데요”라고 하면 대화가 부드러워져요.',
    '다른 의견인데요'
  ),
  (
    'kiip4-emo-01', 'ko', 'ko',
    '기대했던 일이 잘 안 됐을 때 쓸 수 있는 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"아쉽네요"},{"id":"b","text":"잘 먹겠습니다"},{"id":"c","text":"할인해요?"},{"id":"d","text":"여보세요"}]',
    '아쉬울 때 “아쉽네요”, “안타까워요”라고 말해요.',
    '아쉽네요'
  ),
  (
    'kiip4-emo-02', 'ko', 'ko',
    '“속이 상하다”는 어떤 기분인가요?',
    null,
    '[{"id":"a","text":"배가 부르다"},{"id":"b","text":"기쁘다"},{"id":"c","text":"피곤하다"},{"id":"d","text":"마음이 불편하고 화가 나다"}]',
    '속이 상하다는 마음이 상하거나 화가 난 상태를 말해요.',
    '속이 상하다'
  ),
  (
    'kiip4-cause-01', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 왜 늦었어요?\nB: 길이 _____ 늦었어요.',
    '[{"id":"a","text":"할인해서"},{"id":"b","text":"막혀서"},{"id":"c","text":"맛있어서"},{"id":"d","text":"재미있어서"}]',
    '이유를 말할 때 “~아서/어서”를 써요. “길이 막혀서 늦었어요.”',
    '~아서/어서 · 막혀서'
  ),
  (
    'kiip4-cause-02', 'ko', 'ko',
    '감기에 걸린 이유를 말할 때 자연스러운 문장은 무엇인가요?',
    null,
    '[{"id":"a","text":"할인해서 감기에 걸렸어요"},{"id":"b","text":"여보세요 감기에 걸렸어요"},{"id":"c","text":"어제 비를 맞아서 감기에 걸린 것 같아요"},{"id":"d","text":"취미가 감기에 걸렸어요"}]',
    '원인과 결과를 “~아서/어서 ~ 것 같아요”로 연결할 수 있어요.',
    '~아서 감기에 걸린 것 같아요'
  ),
  (
    'kiip4-contr-01', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 어제 영화 봤어요?\nB: 보고 싶었는데 _____ 못 봤어요.',
    '[{"id":"a","text":"시간이 없어서"},{"id":"b","text":"맛있어서"},{"id":"c","text":"할인해서"},{"id":"d","text":"재미있어서"}]',
    '기대와 다른 결과를 말할 때 “~고 싶었는데 ~아서/어서 못 했어요”를 써요.',
    '~고 싶었는데'
  ),
  (
    'kiip4-contr-02', 'ko', 'ko',
    '“그럼에도 불구하고”와 비슷한 뜻의 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"그래서"},{"id":"b","text":"그런데도"},{"id":"c","text":"왜냐하면"},{"id":"d","text":"예를 들어"}]',
    '앞의 상황과 반대되는 결과를 말할 때 “그런데도”, “그럼에도 불구하고”를 써요.',
    '그런데도'
  ),
  (
    'kiip4-sugg-01', 'ko', 'ko',
    '상대에게 함께 가자고 제안할 때 자연스러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"같이 가는 게 어떨까요?"},{"id":"b","text":"같이 가"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"머리가 아파요"}]',
    '제안을 부드럽게 할 때 “~는 게 어떨까요?”를 써요.',
    '~는 게 어떨까요?'
  ),
  (
    'kiip4-sugg-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 주말에 뭐 할까요?\nB: 날씨가 좋으니까 _____ 어때요?',
    '[{"id":"a","text":"야근하는 게"},{"id":"b","text":"처방전이"},{"id":"c","text":"월세가"},{"id":"d","text":"공원에 가는 게"}]',
    '이유를 말한 뒤 제안을 이어갈 때 “~니까 ~는 게 어때요?”를 써요.',
    '~는 게 어때요?'
  ),
  (
    'kiip4-reg-01', 'ko', 'ko',
    '“후회하다”는 어떤 마음인가요?',
    null,
    '[{"id":"a","text":"기대하다"},{"id":"b","text":"기뻐하다"},{"id":"c","text":"지난 일을 아쉬워하다"},{"id":"d","text":"화가 나다"}]',
    '후회하다는 이미 지나간 일을 아쉽게 여기는 마음을 말해요.',
    '후회하다'
  ),
  (
    'kiip4-reg-02', 'ko', 'ko',
    '시험을 망친 뒤 할 수 있는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"할인해요?"},{"id":"b","text":"더 공부할 걸 그랬어요"},{"id":"c","text":"여보세요"},{"id":"d","text":"잘 먹겠습니다"}]',
    '하지 않은 일을 후회할 때 “~할 걸 그랬어요”라고 해요.',
    '~할 걸 그랬어요'
  ),
  (
    'kiip4-comp-01', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이 일은 혼자서는 어려울 것 같아요.\nB: 그럼 _____ 같이 해 볼까요?',
    '[{"id":"a","text":"우리"},{"id":"b","text":"처방전이"},{"id":"c","text":"월세가"},{"id":"d","text":"야근이"}]',
    '혼자 하기 어려운 일에 대해 함께하자고 제안하는 자연스러운 흐름이에요.',
    '같이 해 볼까요?'
  ),
  (
    'kiip4-comp-02', 'ko', 'ko',
    '일이 예상보다 복잡해졌을 때 쓸 수 있는 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"생각보다 간단하네요"},{"id":"b","text":"여보세요"},{"id":"c","text":"생각보다 복잡하네요"},{"id":"d","text":"할인해요?"}]',
    '기대를 벗어난 상황을 “생각보다 ~네요”로 표현해요.',
    '생각보다 ~네요'
  ),
  (
    'kiip4-news-01', 'ko', 'ko',
    '“소식이 있다”는 무엇을 의미하나요?',
    null,
    '[{"id":"a","text":"음식이 있다"},{"id":"b","text":"새로운 정보나 일이 있다"},{"id":"c","text":"돈이 있다"},{"id":"d","text":"시간이 있다"}]',
    '소식은 새로운 정보나 근황을 말해요. “좋은 소식이 있어요.”',
    '소식이 있다'
  ),
  (
    'kiip4-news-02', 'ko', 'ko',
    '좋은 소식을 전할 때 자연스러운 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"좋은 소식이 있어요"},{"id":"b","text":"머리가 아파요"},{"id":"c","text":"환승해요"},{"id":"d","text":"월세예요"}]',
    '기쁜 일을 알릴 때 “좋은 소식이 있어요”라고 말해요.',
    '좋은 소식이 있어요'
  ),
  (
    'kiip4-rel-01', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 민수 씨하고 어떻게 지내요?\nB: 요즘 _____ 자주 못 만났어요.',
    '[{"id":"a","text":"할인해서"},{"id":"b","text":"맛있어서"},{"id":"c","text":"재미있어서"},{"id":"d","text":"바빠서"}]',
    '관계를 설명할 때 이유를 “~아서/어서”로 덧붙일 수 있어요.',
    '자주 못 만났어요'
  ),
  (
    'kiip4-plan-01', 'ko', 'ko',
    '앞으로의 계획을 말할 때 자연스러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"어제 영화를 봤어요"},{"id":"b","text":"내년에는 한국어 공부를 더 열심히 할 생각이에요"},{"id":"c","text":"여보세요"},{"id":"d","text":"얼마예요?"}]',
    '계획을 말할 때 “~할 생각이에요”, “~하려고 해요”를 써요.',
    '~할 생각이에요'
  ),
  (
    'kiip4-plan-02', 'ko', 'ko',
    '“예정이다”와 비슷한 뜻의 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"~할 계획이다"},{"id":"b","text":"~했을 것이다"},{"id":"c","text":"~하고 싶다 (과거)"},{"id":"d","text":"~하지 않았다"}]',
    '예정이다, 계획이다는 앞으로 하기로 한 일을 말할 때 써요.',
    '예정이다 · 계획이다'
  )
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
