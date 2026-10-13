-- KIIP Stage 1: Vietnamese UI locale (prompt / options labels / explanation)
-- Learning content (Korean phrases in dialogues & answer choices that are Korean) stays Korean.
-- UI language (instructions + explanations) is Vietnamese.

insert into public.kiip_question_locales
  (question_id, locale, target_locale, prompt, context, options, explanation, vocabulary)
values
  -- batch 1
  (
    'kiip1-greeting-01', 'vi', 'vi',
    'Cách nói tiếng Việt gần nghĩa nhất với “안녕하세요” là gì?',
    null,
    '[{"id":"a","text":"Cảm ơn"},{"id":"b","text":"Xin chào"},{"id":"c","text":"Tạm biệt"},{"id":"d","text":"Xin lỗi"}]',
    'Xin chào dùng khi gặp nhau hoặc chào hỏi lần đầu.',
    '안녕하세요 · Xin chào'
  ),
  (
    'kiip1-greeting-02', 'vi', 'ko',
    'Khi gặp người lần đầu, lời chào tự nhiên nhất là gì?',
    E'A: 처음 뵙겠습니다.\nB: _____.',
    '[{"id":"a","text":"안녕하세요"},{"id":"b","text":"괜찮아요"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"어서 오세요"}]',
    'Khi mới gặp, hãy nói 안녕하세요 hoặc 처음 뵙겠습니다.',
    '처음 뵙겠습니다'
  ),
  (
    'kiip1-thanks-01', 'vi', 'vi',
    'Cách nói tiếng Việt của “감사합니다” là gì?',
    null,
    '[{"id":"a","text":"Không sao"},{"id":"b","text":"Tạm biệt"},{"id":"c","text":"Cảm ơn"},{"id":"d","text":"Xin chào"}]',
    'Cảm ơn dùng để bày tỏ lòng biết ơn.',
    '감사합니다 · Cảm ơn'
  ),
  (
    'kiip1-apology-01', 'vi', 'vi',
    'Khi vô tình va vào người trên đường, lời nói tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"미안합니다"},{"id":"b","text":"맛있게 드세요"},{"id":"c","text":"축하합니다"},{"id":"d","text":"다녀오세요"}]',
    'Khi làm phiền người khác vì sơ suất, hãy nói 미안합니다.',
    '미안합니다 · Xin lỗi'
  ),
  (
    'kiip1-shopping-01', 'vi', 'vi',
    'Chọn từ điền vào chỗ trống.',
    E'A: 이 사과는 한 개에 얼마예요?\nB: _____원이에요.',
    '[{"id":"a","text":"삼천"},{"id":"b","text":"어디"},{"id":"c","text":"누구"},{"id":"d","text":"언제"}]',
    'Khi nói giá, dùng số Hán-Hàn với 원. Ví dụ: 삼천 원이에요.',
    '얼마예요? · Bao nhiêu tiền?'
  ),
  (
    'kiip1-location-01', 'vi', 'vi',
    '“화장실이 어디예요?” dùng trong tình huống nào?',
    null,
    '[{"id":"a","text":"Khi hỏi giá"},{"id":"b","text":"Khi hỏi giờ"},{"id":"c","text":"Khi hỏi địa điểm"},{"id":"d","text":"Khi hỏi tên"}]',
    '어디예요? dùng để hỏi nơi chốn hoặc vị trí.',
    '어디예요? · Ở đâu?'
  ),
  (
    'kiip1-time-01', 'vi', 'ko',
    'Chọn từ điền vào chỗ trống.',
    E'A: 몇 시에 만날까요?\nB: _____ 만나요.',
    '[{"id":"a","text":"세 시에"},{"id":"b","text":"학교에서"},{"id":"c","text":"친구를"},{"id":"d","text":"맛있게"}]',
    'Với câu hỏi 몇 시에?, hãy trả lời bằng giờ, ví dụ 세 시에.',
    '몇 시에 만날까요?'
  ),
  (
    'kiip1-food-01', 'vi', 'ko',
    'Trước khi bắt đầu ăn, người ta thường nói gì?',
    null,
    '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"안녕히 가세요"},{"id":"c","text":"괜찮습니다"},{"id":"d","text":"어서 오세요"}]',
    'Trước bữa ăn nói 잘 먹겠습니다, sau bữa ăn nói 잘 먹었습니다.',
    '잘 먹겠습니다'
  ),
  (
    'kiip1-transport-01', 'vi', 'vi',
    'Câu “버스 정류장이 어디예요?” hỏi điều gì?',
    null,
    '[{"id":"a","text":"Giá vé xe buýt"},{"id":"b","text":"Giờ xe buýt"},{"id":"c","text":"Vị trí trạm xe buýt"},{"id":"d","text":"Màu xe buýt"}]',
    'Câu có 어디예요? thường hỏi vị trí hoặc địa điểm.',
    '정류장 · Trạm xe buýt'
  ),
  (
    'kiip1-home-01', 'vi', 'ko',
    'Chọn cách nói tự nhiên nhất cho chỗ trống.',
    E'A: 오늘 날씨가 어때요?\nB: _____ 좋아요.',
    '[{"id":"a","text":"날씨가"},{"id":"b","text":"이름이"},{"id":"c","text":"주소가"},{"id":"d","text":"전화번호가"}]',
    'Khi nói về thời tiết, dùng 날씨가 좋아요.',
    '날씨가 좋아요'
  ),
  -- batch 2
  (
    'kiip1-intro-01', 'vi', 'ko',
    'Khi tự giới thiệu, câu tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"몇 시예요?"},{"id":"b","text":"제 이름은 민수예요"},{"id":"c","text":"얼마예요?"},{"id":"d","text":"맛있어요"}]',
    'Khi nói tên, dùng “제 이름은 ~예요”.',
    '제 이름은 ~예요'
  ),
  (
    'kiip1-intro-02', 'vi', 'vi',
    '“만나서 반갑습니다” gần nghĩa nhất với ý nào?',
    null,
    '[{"id":"a","text":"Rất vui được gặp lần đầu"},{"id":"b","text":"Giá đắt"},{"id":"c","text":"Không có thời gian"},{"id":"d","text":"Đường xa"}]',
    '만나서 반갑습니다 là lời chào khi mới gặp.',
    '만나서 반갑습니다 · Rất vui được gặp'
  ),
  (
    'kiip1-greeting-03', 'vi', 'ko',
    'Buổi sáng gặp hàng xóm, lời chào tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"잘 먹었습니다"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"안녕하세요"},{"id":"d","text":"어디 가요?"}]',
    'Ban ngày hoặc buổi sáng vẫn có thể chào bằng 안녕하세요.',
    '안녕하세요'
  ),
  (
    'kiip1-thanks-02', 'vi', 'ko',
    'Sau khi được giúp đỡ, câu phù hợp nhất là gì?',
    null,
    '[{"id":"a","text":"감사합니다"},{"id":"b","text":"실례합니다"},{"id":"c","text":"어서 오세요"},{"id":"d","text":"몇 시예요?"}]',
    'Khi nhận giúp đỡ hoặc quà, hãy nói 감사합니다.',
    '감사합니다'
  ),
  (
    'kiip1-apology-02', 'vi', 'vi',
    '“죄송합니다” dùng trong tình huống nào?',
    null,
    '[{"id":"a","text":"Khi gọi món"},{"id":"b","text":"Khi hỏi giá"},{"id":"c","text":"Khi giới thiệu bạn"},{"id":"d","text":"Khi xin lỗi vì sơ suất"}]',
    'Khi mắc lỗi hoặc làm phiền, dùng 죄송합니다 / 미안합니다.',
    '죄송합니다 · Xin lỗi'
  ),
  (
    'kiip1-shopping-02', 'vi', 'ko',
    'Ở cửa hàng, muốn hỏi giá thì nói thế nào?',
    null,
    '[{"id":"a","text":"이름이 뭐예요?"},{"id":"b","text":"이거 얼마예요?"},{"id":"c","text":"몇 시예요?"},{"id":"d","text":"어디 살아요?"}]',
    'Khi hỏi giá, nói “이거 얼마예요?”.',
    '얼마예요?'
  ),
  (
    'kiip1-shopping-03', 'vi', 'ko',
    'Chọn từ điền vào chỗ trống.',
    E'A: 이 티셔츠 있어요?\nB: 네, _____.',
    '[{"id":"a","text":"세 시예요"},{"id":"b","text":"맛있어요"},{"id":"c","text":"여기 있어요"},{"id":"d","text":"감사합니다"}]',
    'Khi có hàng, có thể nói “여기 있어요”.',
    '여기 있어요'
  ),
  (
    'kiip1-location-02', 'vi', 'ko',
    'Chọn cách nói điền vào chỗ trống.',
    E'A: 지하철역이 어디예요?\nB: _____ 있어요.',
    '[{"id":"a","text":"저쪽에"},{"id":"b","text":"삼천 원"},{"id":"c","text":"민수 씨"},{"id":"d","text":"잘 먹겠습니다"}]',
    'Khi chỉ vị trí, có thể nói “저쪽에 있어요”.',
    '어디예요? · 저쪽에'
  ),
  (
    'kiip1-location-03', 'vi', 'ko',
    'Khi lạc đường, câu hỏi tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"몇 살이에요?"},{"id":"b","text":"맛있어요?"},{"id":"c","text":"이름이 뭐예요?"},{"id":"d","text":"이 길이 맞아요?"}]',
    'Để xác nhận đường, có thể hỏi “이 길이 맞아요?”.',
    '이 길이 맞아요?'
  ),
  (
    'kiip1-time-02', 'vi', 'vi',
    '“지금 몇 시예요?” hỏi về điều gì?',
    null,
    '[{"id":"a","text":"Địa điểm"},{"id":"b","text":"Thời gian"},{"id":"c","text":"Giá cả"},{"id":"d","text":"Tên"}]',
    '몇 시예요? dùng để hỏi giờ.',
    '몇 시예요? · Mấy giờ?'
  ),
  (
    'kiip1-time-03', 'vi', 'ko',
    'Khi hẹn giờ gặp, câu phù hợp nhất là gì?',
    null,
    '[{"id":"a","text":"내일 두 시에 만나요"},{"id":"b","text":"화장실이 어디예요?"},{"id":"c","text":"잘 먹었습니다"},{"id":"d","text":"얼마예요?"}]',
    'Khi hẹn, nói ngày và giờ, ví dụ “내일 두 시에 만나요”.',
    '만나요 · 두 시에'
  ),
  (
    'kiip1-food-02', 'vi', 'ko',
    'Chọn từ điền vào chỗ trống.',
    E'A: 이거 매워요?\nB: 아니요, _____.',
    '[{"id":"a","text":"세 시예요"},{"id":"b","text":"안 매워요"},{"id":"c","text":"저쪽에 있어요"},{"id":"d","text":"제 이름이에요"}]',
    'Khi được hỏi có cay không, có thể trả lời “안 매워요”.',
    '매워요 · 안 매워요'
  ),
  (
    'kiip1-food-03', 'vi', 'ko',
    'Sau khi gọi món ở nhà hàng, câu thường nghe là gì?',
    null,
    '[{"id":"a","text":"이름이 뭐예요?"},{"id":"b","text":"몇 시예요?"},{"id":"c","text":"조금만 기다려 주세요"},{"id":"d","text":"정류장이 어디예요?"}]',
    'Sau khi nhận order, thường nghe “조금만 기다려 주세요”.',
    '기다려 주세요'
  ),
  (
    'kiip1-transport-02', 'vi', 'ko',
    'Khi đi taxi, cách nói điểm đến tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"서울역으로 가 주세요"},{"id":"b","text":"감사합니다 맛있어요"},{"id":"c","text":"이름이 민수예요"},{"id":"d","text":"날씨가 좋아요"}]',
    'Nói điểm đến rồi thêm “으로/로 가 주세요”.',
    '~로 가 주세요'
  ),
  (
    'kiip1-number-01', 'vi', 'ko',
    'Sau “하나, 둘, 셋” số tiếp theo là gì?',
    null,
    '[{"id":"a","text":"열"},{"id":"b","text":"일곱"},{"id":"c","text":"넷"},{"id":"d","text":"아홉"}]',
    'Số thuần Hàn: 하나 둘 셋 넷 다섯…',
    '넷'
  ),
  (
    'kiip1-phone-01', 'vi', 'ko',
    'Chọn cách nói điền vào chỗ trống.',
    E'A: 전화번호가 어떻게 되세요?\nB: _____.',
    '[{"id":"a","text":"날씨가 좋아요"},{"id":"b","text":"010-1234-5678이에요"},{"id":"c","text":"잘 먹겠습니다"},{"id":"d","text":"저쪽에 있어요"}]',
    'Khi được hỏi số điện thoại, hãy trả lời bằng số.',
    '전화번호'
  ),
  (
    'kiip1-help-01', 'vi', 'ko',
    'Khi cần giúp đỡ, câu tự nhiên nhất là gì?',
    null,
    '[{"id":"a","text":"좀 도와주세요"},{"id":"b","text":"삼천 원이에요"},{"id":"c","text":"잘 먹었습니다"},{"id":"d","text":"이름이 뭐예요?"}]',
    'Khi cần trợ giúp, nói “좀 도와주세요”.',
    '도와주세요'
  ),
  (
    'kiip1-weather-01', 'vi', 'ko',
    '“비가 와요” nói về điều gì?',
    null,
    '[{"id":"a","text":"Đói bụng"},{"id":"b","text":"Muộn giờ"},{"id":"c","text":"Giá rẻ"},{"id":"d","text":"Trời mưa"}]',
    '비가 와요 dùng để nói thời tiết mưa.',
    '비가 와요'
  ),
  (
    'kiip1-family-01', 'vi', 'ko',
    'Chọn từ điền vào chỗ trống.',
    E'A: 가족이 몇 명이에요?\nB: _____ 있어요.',
    '[{"id":"a","text":"네 명"},{"id":"b","text":"세 시"},{"id":"c","text":"삼천 원"},{"id":"d","text":"저쪽"}]',
    'Đếm người dùng 명. Ví dụ: 네 명 있어요.',
    '몇 명이에요? · 명'
  ),
  (
    'kiip1-daily-02', 'vi', 'ko',
    'Trước khi vào nhà, bấm chuông rồi nói gì là phù hợp?',
    null,
    '[{"id":"a","text":"잘 먹겠습니다"},{"id":"b","text":"얼마예요?"},{"id":"c","text":"계세요?"},{"id":"d","text":"몇 시예요?"}]',
    'Khi đến thăm, có thể hỏi “계세요?”.',
    '계세요?'
  )
on conflict (question_id, locale, target_locale) do update set
  prompt = excluded.prompt,
  context = excluded.context,
  options = excluded.options,
  explanation = excluded.explanation,
  vocabulary = excluded.vocabulary,
  updated_at = now();
