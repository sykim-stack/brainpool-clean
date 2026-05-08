// modules/notion-sync-layer.js
export async function NotionSyncLayer(ctx) {
  if (!ctx.payload.lastTask && !ctx.payload.problems) return ctx;

  const { notionApiKey, notionDbId } = await chrome.storage.local.get(['notionApiKey', 'notionDbId']);
  if (!notionApiKey || !notionDbId) {
    console.warn('Notion 설정이 완료되지 않았습니다.');
    return ctx;
  }

  const lesson = ctx._error
    ? `⚠️ 실패에서 배움: ${ctx._error}`
    : (ctx.payload.problems || '✅ 순항 중');

  try {
    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: notionDbId },
        properties: {
          Project: { title: [{ text: { content: ctx.payload.projectName || 'BRAINPOOL' } }] },
          'Last Task': { rich_text: [{ text: { content: ctx.payload.lastTask || 'N/A' } }] },
          'Problems': { rich_text: [{ text: { content: lesson } }] },
          'Updated At': { date: { start: new Date().toISOString() } },
        },
      }),
    });
  } catch (e) {
    console.error('Notion sync failed:', e.message);
  }

  return ctx;
}