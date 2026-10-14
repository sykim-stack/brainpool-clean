-- KIIP Stage 3 batch 1: 20 approved questions (중급 1 · 사회생활)
-- Topics: workplace, hospital, public-office, invitation, formal, culture

insert into public.kiip_questions
  (id, stage, type, topic_key, answer_option_id, difficulty, status, source, reviewed_at, reviewed_by)
values
  ('kiip3-work-01', 3, 'response', 'workplace', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-work-02', 3, 'context', 'workplace', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-work-03', 3, 'meaning', 'workplace', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-hosp-01', 3, 'response', 'hospital', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-hosp-02', 3, 'context', 'hospital', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-hosp-03', 3, 'meaning', 'hospital', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-office-01', 3, 'response', 'public-office', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-office-02', 3, 'context', 'public-office', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-invite-01', 3, 'response', 'invitation', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-invite-02', 3, 'context', 'invitation', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-formal-01', 3, 'meaning', 'formal', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-formal-02', 3, 'response', 'formal', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-bank-01', 3, 'response', 'bank', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-bank-02', 3, 'context', 'bank', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-rent-01', 3, 'meaning', 'housing', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-rent-02', 3, 'response', 'housing', 'b', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-culture-01', 3, 'meaning', 'culture', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-culture-02', 3, 'response', 'culture', 'c', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-complain-01', 3, 'context', 'complaint', 'd', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1'),
  ('kiip3-advice-01', 3, 'response', 'advice', 'a', 'intermediate', 'approved', 'generated', now(), 'hermes-batch1')
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
    'kiip3-work-01', 'ko', 'ko',
    '회사 회의에서 의견을 말할 때 가장 자연스러운 표현은 무엇인가요?',
    null,
    '[{"id":"a","text":"이거 얼마예요?"},{"id":"b","text":"제 생각에는 이렇게 하는 게 좋을 것 같습니다"},{"id":"c","text":"여보세요"},{"id":"d","text":"잘 먹겠습니다"}]',
    '의견을 공손히 말할 때 “제 생각에는 ~ 것 같습니다”를 자주 써요.',
    '제 생각에는 ~ 것 같습니다'
  ),
  (
    'kiip3-work-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 이번 주까지 보고서를 제출해야 하나요?\nB: 네, _____ 제출해 주세요.',
    '[{"id":"a","text":"금요일까지"},{"id":"b","text":"삼천 원"},{"id":"c","text":"머리가 아파요"},{"id":"d","text":"환승해요"}]',
    '마감을 말할 때 “~까지 제출해 주세요”처럼 기한을 명확히 해요.',
    '제출해 주세요 · ~까지'
  ),
  (
    'kiip3-work-03', 'ko', 'ko',
    '“야근하다”는 무엇을 의미하나요?',
    null,
    '[{"id":"a","text":"아침에 일찍 출근하다"},{"id":"b","text":"휴가를 내다"},{"id":"c","text":"정규 퇴근 시간 이후에도 일하다"},{"id":"d","text":"회의를 하다"}]',
    '야근은 정해진 근무 시간 이후에도 회사에 남아 일하는 것을 말해요.',
    '야근하다'
  ),
  (
    'kiip3-hosp-01', 'ko', 'ko',
    '병원에서 접수할 때 직원에게 할 수 있는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"진료 접수하려고 하는데요"},{"id":"b","text":"할인해요?"},{"id":"c","text":"취미가 뭐예요?"},{"id":"d","text":"더 싼 거 있어요?"}]',
    '병원에 처음 가면 “진료 접수하려고 하는데요”라고 말해요.',
    '진료 접수'
  ),
  (
    'kiip3-hosp-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 어디가 불편하세요?\nB: _____.',
    '[{"id":"a","text":"세 시예요"},{"id":"b","text":"이름이 민수예요"},{"id":"c","text":"날씨가 좋아요"},{"id":"d","text":"배가 아파요"}]',
    '증상을 설명할 때 “배가 아파요”, “열이 나요”처럼 말해요.',
    '어디가 불편하세요?'
  ),
  (
    'kiip3-hosp-03', 'ko', 'ko',
    '“처방전”은 무엇인가요?',
    null,
    '[{"id":"a","text":"병원 예약증"},{"id":"b","text":"의사가 약 처방을 적은 서류"},{"id":"c","text":"보험 카드"},{"id":"d","text":"진료비 영수증"}]',
    '처방전이 있어야 약국에서 약을 받을 수 있어요.',
    '처방전'
  ),
  (
    'kiip3-office-01', 'ko', 'ko',
    '주민센터에서 서류를 발급받고 싶을 때 뭐라고 말하나요?',
    null,
    '[{"id":"a","text":"잘 먹었습니다"},{"id":"b","text":"여보세요"},{"id":"c","text":"주민등록등본 발급해 주세요"},{"id":"d","text":"더 싼 거 있어요?"}]',
    '필요한 서류 이름을 말하고 “발급해 주세요”라고 요청해요.',
    '발급해 주세요'
  ),
  (
    'kiip3-office-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 신분증 있으세요?\nB: 네, _____.',
    '[{"id":"a","text":"여기 있습니다"},{"id":"b","text":"머리가 아파요"},{"id":"c","text":"환승해요"},{"id":"d","text":"삼천 원이에요"}]',
    '신분증을 보여 줄 때 “여기 있습니다”라고 해요.',
    '신분증 · 여기 있습니다'
  ),
  (
    'kiip3-invite-01', 'ko', 'ko',
    '집들이에 초대받았을 때 가져가면 좋은 것을 고르세요.',
    null,
    '[{"id":"a","text":"쓰레기"},{"id":"b","text":"세제나 휴지"},{"id":"c","text":"낡은 옷"},{"id":"d","text":"빈 상자"}]',
    '한국에서는 집들이에 세제, 휴지, 화장지 같은 생활용품을 가져가는 경우가 많아요.',
    '집들이'
  ),
  (
    'kiip3-invite-02', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 이번 주 토요일에 시간 되세요?\nB: 네, _____. 무슨 일이세요?',
    '[{"id":"a","text":"아파요"},{"id":"b","text":"할인해요"},{"id":"c","text":"괜찮아요"},{"id":"d","text":"환승해요"}]',
    '초대나 약속을 제안받을 때 “괜찮아요”로 수락한 뒤 이유를 물을 수 있어요.',
    '시간 되세요?'
  ),
  (
    'kiip3-formal-01', 'ko', 'ko',
    '“실례합니다”를 쓰는 상황은 무엇인가요?',
    null,
    '[{"id":"a","text":"길을 지나가거나 사람을 부를 때"},{"id":"b","text":"식사를 시작할 때"},{"id":"c","text":"가격을 물을 때"},{"id":"d","text":"취미를 말할 때"}]',
    '길을 비키거나 모르는 사람에게 말을 걸 때 “실례합니다”라고 해요.',
    '실례합니다'
  ),
  (
    'kiip3-formal-02', 'ko', 'ko',
    '윗사람에게 선물을 드릴 때 가장 공손한 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"이거 받아"},{"id":"b","text":"선물이야"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"작은 선물이지만 받아 주세요"}]',
    '선물을 드릴 때 “작은 선물이지만 받아 주세요”처럼 겸손하게 말해요.',
    '받아 주세요'
  ),
  (
    'kiip3-bank-01', 'ko', 'ko',
    '은행에서 계좌를 만들고 싶을 때 뭐라고 말하나요?',
    null,
    '[{"id":"a","text":"머리가 아파요"},{"id":"b","text":"통장 만들려고 하는데요"},{"id":"c","text":"할인해요?"},{"id":"d","text":"여보세요"}]',
    '계좌 개설을 요청할 때 “통장 만들려고 하는데요”라고 해요.',
    '통장 만들려고 하는데요'
  ),
  (
    'kiip3-bank-02', 'ko', 'ko',
    '빈칸에 들어갈 말을 고르세요.',
    E'A: 비밀번호를 입력해 주세요.\nB: _____.',
    '[{"id":"a","text":"네, 알겠습니다"},{"id":"b","text":"잘 먹겠습니다"},{"id":"c","text":"환승해요"},{"id":"d","text":"더 싼 거 있어요?"}]',
    '안내를 듣고 따를 때 “네, 알겠습니다”라고 답해요.',
    '알겠습니다'
  ),
  (
    'kiip3-rent-01', 'ko', 'ko',
    '“월세”는 무엇인가요?',
    null,
    '[{"id":"a","text":"집을 살 때 내는 돈"},{"id":"b","text":"전기 요금"},{"id":"c","text":"매달 집주인에게 내는 임대료"},{"id":"d","text":"보증금"}]',
    '월세는 매달 내는 집세이고, 보증금은 처음에 맡기는 돈이에요.',
    '월세 · 보증금'
  ),
  (
    'kiip3-rent-02', 'ko', 'ko',
    '집을 구할 때 부동산에 할 수 있는 질문은 무엇인가요?',
    null,
    '[{"id":"a","text":"취미가 뭐예요?"},{"id":"b","text":"이 근처 원룸 있어요?"},{"id":"c","text":"머리가 아파요"},{"id":"d","text":"여보세요"}]',
    '원하는 집 형태와 지역을 말해 물건을 찾아 달라고 요청해요.',
    '원룸 있어요?'
  ),
  (
    'kiip3-culture-01', 'ko', 'ko',
    '한국에서 식사를 시작할 때 하는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"잘 가"},{"id":"c","text":"할인해요?"},{"id":"d","text":"환승해요"}]',
    '식사 전에는 “잘 먹겠습니다”, 식사 후에는 “잘 먹었습니다”라고 해요.',
    '잘 먹겠습니다'
  ),
  (
    'kiip3-culture-02', 'ko', 'ko',
    '상대방이 재채기를 했을 때 할 수 있는 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"얼마예요?"},{"id":"b","text":"여보세요"},{"id":"c","text":"괜찮으세요?"},{"id":"d","text":"더 싼 거 있어요?"}]',
    '재채기나 기침을 하면 “괜찮으세요?”라고 걱정해 주는 것이 자연스러워요.',
    '괜찮으세요?'
  ),
  (
    'kiip3-complain-01', 'ko', 'ko',
    '빈칸에 들어갈 표현을 고르세요.',
    E'A: 주문한 음식이 아직 안 나왔어요.\nB: 죄송합니다. _____ 확인하겠습니다.',
    '[{"id":"a","text":"할인해요"},{"id":"b","text":"환승해요"},{"id":"c","text":"여보세요"},{"id":"d","text":"바로"}]',
    '불만에 대응할 때 “바로 확인하겠습니다”처럼 빠르게 조치하겠다고 말해요.',
    '확인하겠습니다'
  ),
  (
    'kiip3-advice-01', 'ko', 'ko',
    '친구에게 조언을 구할 때 가장 자연스러운 말은 무엇인가요?',
    null,
    '[{"id":"a","text":"어떻게 하면 좋을까요?"},{"id":"b","text":"이거 얼마예요?"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"여보세요"}]',
    '조언을 요청할 때 “어떻게 하면 좋을까요?”라고 물어요.',
    '어떻게 하면 좋을까요?'
  )
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
