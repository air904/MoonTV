# Alan Daily To-Do Automation (Outlook + Teams + Confluence)

> Purpose: provide a repeatable workflow for generating Alan Lin's daily To-Do summary and publishing to Word, Confluence, and email.

## TODAY

Use:

```bash
date +%Y-%m-%d
```

## Required integrations

This workflow assumes the following tools/integrations are available in your runtime:

- `outlook_email_search`
- `chat_message_search`
- `searchConfluenceUsingCql`
- `getConfluencePage`
- `updateConfluencePage`
- Browser automation (for Outlook Web send)

## Data model (normalize all sources)

Each task should be normalized into this schema:

```ts
{
  section: "urgent" | "confluence" | "email_teams" | "tracking";
  taskZhTw: string;
  owner: string;          // "Alan" or specific team member
  eta: string;            // ISO date or short due-text
  source: string;         // Outlook / Teams / Confluence
  isAlan: boolean;        // true = Alan decision/action
  action: string;         // concrete next action
  risk?: string;          // optional risk text
}
```

## Output requirements

1. Word file at:
   - `/sessions/optimistic-vibrant-archimedes/mnt/2026/todo-{TODAY}.docx`
2. Confluence page update:
   - pageId: `1210351956` (title: `Alan`)
3. Email summary to:
   - `alan.lin@netgear.com`

## Markdown sections for Confluence body

Use this order:

1. `Daily To-Do List — {TODAY}`
2. Source note (Outlook/Teams/Confluence counts)
3. `🔴 緊急`
4. `🟡 本週（Confluence）`
5. `🟡 本週（Email/Teams）`
6. `🟢 追蹤`
7. `📋 本週重點摘要`

## Status template

```text
✅ 今日 To-Do 已整理完成！（{TODAY}）
- 來源：Outlook {N} 封 + Teams {N} 則 + Confluence MS Space 週報
- 緊急 {N} 項 | 本週 {N} 項 | 追蹤 {N} 項
- 📄 Word 檔：[查看 To-Do](computer:///sessions/optimistic-vibrant-archimedes/mnt/2026/todo-{TODAY}.docx)
- 🔷 Confluence 已更新：https://netgearcloud.atlassian.net/wiki/spaces/MS/pages/1210351956/Alan
- 📧 摘要信已寄至 alan.lin@netgear.com
```
