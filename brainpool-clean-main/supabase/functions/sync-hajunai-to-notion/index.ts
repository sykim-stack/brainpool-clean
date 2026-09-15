import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Client } from 'npm:@notionhq/client'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const notion = new Client({ auth: Deno.env.get('NOTION_API_KEY') })

Deno.serve(async (req) => {
  // 미동기화 로그 조회
  const { data: logs, error } = await supabase
    .from('hajunai_logs')
    .select('*')
    .eq('synced_to_notion', false)
    .limit(10)

  if (error || !logs?.length) return new Response('No logs', { status: 200 })

  for (const log of logs) {
    try {
      const page = await notion.pages.create({
        parent: { database_id: Deno.env.get('NOTION_DB_ID')! },
        properties: {
          Project: { title: [{ text: { content: log.project } }] },
          'Last Task': { rich_text: [{ text: { content: log.last_task } }] },
          Problems: { rich_text: [{ text: { content: log.problems || '' } }] },
          Solution: { rich_text: [{ text: { content: log.solution || '' } }] },
          Status: { select: { name: log.status } },
          'Updated At': { date: { start: log.updated_at } },
          Tags: { multi_select: (log.tags || []).map(t => ({ name: t })) }
        }
      })
      // 동기화 완료 표시
      await supabase.from('hajunai_logs').update({
        synced_to_notion: true,
        notion_page_id: page.id
      }).eq('id', log.id)
    } catch (err) {
      console.error(`Notion sync failed for ${log.id}`, err)
    }
  }
  return new Response(`Synced ${logs.length} logs`, { status: 200 })
})