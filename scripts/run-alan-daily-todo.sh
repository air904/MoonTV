#!/usr/bin/env bash
set -euo pipefail

TODAY="$(date +%Y-%m-%d)"

cat <<MSG
[Alan Daily To-Do]
TODAY=${TODAY}

This helper confirms date and prints the required integration actions.

Next steps (must run in environment with enterprise tools enabled):
1) outlook_email_search (past 7 days, limit 50)
2) chat_message_search (past 7 days, limit 50)
3) searchConfluenceUsingCql + getConfluencePage
4) Update /sessions/optimistic-vibrant-archimedes/docx_work/gen_todo_v2.js
5) node gen_todo_v2.js
6) validate.py todo-${TODAY}.docx until pass
7) updateConfluencePage (pageId 1210351956)
8) send Outlook mail to alan.lin@netgear.com

Output target:
/sessions/optimistic-vibrant-archimedes/mnt/2026/todo-${TODAY}.docx
MSG
