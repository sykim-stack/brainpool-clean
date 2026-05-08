import { getSupabase } from '@/lib/supabase';

// 라우트 핸들러 내부에서 필요할 때마다 호출하여 사용
const supabase = getSupabase();

async function saveHajunaiLog(extracted: {
  project: string
  lastTask: string
  problems?: string
  solution?: string
  status?: string
  tags?: string[]
}) {
 await (supabase as any).from('hajunai_logs').insert({
  project: extracted.project,
  last_task: extracted.lastTask,
  problems: extracted.problems,
  solution: extracted.solution,
  status: extracted.status,
  tags: extracted.tags,
});
}

// 예: 응답 생성 후 자동 추출하여 저장
const extracted = {
  project: '',
  lastTask: '',
  problems: '',
  status: '🟡 진행중'
};
await saveHajunaiLog(extracted)