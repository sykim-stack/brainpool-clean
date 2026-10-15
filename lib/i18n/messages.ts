import type { UiLocale } from '@/lib/locale';

/** CorePhrase 파일럿 키. 다른 화면은 같은 패턴으로 확장 */
export type MessageKey =
  | 'phrase.stat.total'
  | 'phrase.stat.done'
  | 'phrase.stat.reviewToday'
  | 'phrase.stat.streak'
  | 'phrase.filter.all'
  | 'phrase.filter.bookmark'
  | 'phrase.filter.review'
  | 'phrase.startStudy'
  | 'phrase.empty'
  | 'phrase.emptyHint'
  | 'phrase.status.new'
  | 'phrase.status.learning'
  | 'phrase.status.done'
  | 'phrase.edit.meaningPlaceholder'
  | 'phrase.edit.memoPlaceholder'
  | 'phrase.edit.save'
  | 'phrase.edit.cancel'
  | 'phrase.action.delete'
  | 'phrase.action.bookmark'
  | 'phrase.action.unbookmark'
  | 'phrase.study.back'
  | 'phrase.study.toList'
  | 'phrase.study.doneTitle'
  | 'phrase.study.doneSub'
  | 'phrase.study.frontLabel'
  | 'phrase.study.backLabel'
  | 'phrase.study.hint'
  | 'phrase.study.know'
  | 'phrase.study.dontKnow'
  | 'phrase.study.listen'
  | 'phrase.settings.uiLang'
  | 'phrase.settings.learningDir'
  | 'phrase.settings.source'
  | 'phrase.settings.target';

const ko: Record<MessageKey, string> = {
  'phrase.stat.total': '전체',
  'phrase.stat.done': '완료',
  'phrase.stat.reviewToday': '오늘 복습',
  'phrase.stat.streak': '연속 학습',
  'phrase.filter.all': '전체',
  'phrase.filter.bookmark': '북마크',
  'phrase.filter.review': '복습',
  'phrase.startStudy': '학습 시작',
  'phrase.empty': '저장된 단어가 없어요',
  'phrase.emptyHint': '채팅 버블을 클릭해서 단어를 저장해보세요',
  'phrase.status.new': '새로운',
  'phrase.status.learning': '학습중',
  'phrase.status.done': '완료',
  'phrase.edit.meaningPlaceholder': '한국어 번역 수정',
  'phrase.edit.memoPlaceholder': '메모 추가 (예: 더 자연스러운 표현, 사용 상황...)',
  'phrase.edit.save': '저장',
  'phrase.edit.cancel': '취소',
  'phrase.action.delete': '삭제',
  'phrase.action.bookmark': '북마크',
  'phrase.action.unbookmark': '북마크 해제',
  'phrase.study.back': '← 목록',
  'phrase.study.toList': '목록으로',
  'phrase.study.doneTitle': '오늘 학습 완료!',
  'phrase.study.doneSub': '{count}개 카드를 학습했어요',
  'phrase.study.frontLabel': '표현',
  'phrase.study.backLabel': '뜻',
  'phrase.study.hint': '탭해서 뜻 확인',
  'phrase.study.know': '알아요',
  'phrase.study.dontKnow': '모르겠어요',
  'phrase.study.listen': '발음 듣기',
  'phrase.settings.uiLang': '화면 언어',
  'phrase.settings.learningDir': '학습 방향',
  'phrase.settings.source': '출발',
  'phrase.settings.target': '목표',
};

const vi: Record<MessageKey, string> = {
  'phrase.stat.total': 'Tổng',
  'phrase.stat.done': 'Hoàn thành',
  'phrase.stat.reviewToday': 'Ôn hôm nay',
  'phrase.stat.streak': 'Chuỗi ngày',
  'phrase.filter.all': 'Tất cả',
  'phrase.filter.bookmark': 'Đánh dấu',
  'phrase.filter.review': 'Ôn tập',
  'phrase.startStudy': 'Bắt đầu học',
  'phrase.empty': 'Chưa có từ đã lưu',
  'phrase.emptyHint': 'Nhấn bong bóng chat để lưu từ',
  'phrase.status.new': 'Mới',
  'phrase.status.learning': 'Đang học',
  'phrase.status.done': 'Xong',
  'phrase.edit.meaningPlaceholder': 'Sửa bản dịch',
  'phrase.edit.memoPlaceholder': 'Ghi chú (ví dụ: cách nói tự nhiên...)',
  'phrase.edit.save': 'Lưu',
  'phrase.edit.cancel': 'Hủy',
  'phrase.action.delete': 'Xóa',
  'phrase.action.bookmark': 'Đánh dấu',
  'phrase.action.unbookmark': 'Bỏ đánh dấu',
  'phrase.study.back': '← Danh sách',
  'phrase.study.toList': 'Về danh sách',
  'phrase.study.doneTitle': 'Hoàn thành hôm nay!',
  'phrase.study.doneSub': 'Đã học {count} thẻ',
  'phrase.study.frontLabel': 'Cụm từ',
  'phrase.study.backLabel': 'Nghĩa',
  'phrase.study.hint': 'Chạm để xem nghĩa',
  'phrase.study.know': 'Biết rồi',
  'phrase.study.dontKnow': 'Chưa biết',
  'phrase.study.listen': 'Nghe phát âm',
  'phrase.settings.uiLang': 'Ngôn ngữ giao diện',
  'phrase.settings.learningDir': 'Hướng học',
  'phrase.settings.source': 'Nguồn',
  'phrase.settings.target': 'Đích',
};

/** en은 다음 단계. 지금은 ko로 폴백 */
const catalogs: Record<UiLocale, Record<MessageKey, string>> = {
  ko,
  vi,
  en: ko,
};

export function translate(
  locale: UiLocale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const table = catalogs[locale] || ko;
  let text = table[key] ?? ko[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll('{' + k + '}', String(v));
    }
  }
  return text;
}
