import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // 서비스 롤 권한
)

async function saveHajunaiLog(extracted: {
  project: string
  lastTask: string
  problems?: string
  solution?: string
  status?: string
  tags?: string[]
}) {
  await supabase.from('hajunai_logs').insert({
    project: extracted.project,
    last_task: extracted.lastTask,
    problems: extracted.problems,
    solution: extracted.solution,
    status: extracted.status || '🟡 진행중',
    tags: extracted.tags || []
  })
}

// 예: 응답 생성 후 자동 추출하여 저장
const extracted = {
  project: '',
  lastTask: '',
  problems: '',
  status: '🟡 진행중'
};
await saveHajunaiLog(extracted)