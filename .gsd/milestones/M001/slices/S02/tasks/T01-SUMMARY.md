---
id: T01
parent: S02
milestone: M001
key_files:
  - tests/e2e/crm.spec.js
  - tests/e2e/notifications.spec.js
key_decisions:
  - CSS text-transform:uppercase does not change DOM text — locator('text=EMAIL') doesn't match 'Email' in the DOM
  - QuickAddMenu navigates to /?new=contact but index.js doesn't read that query param — product bug noted for S02 CRUD task
  - Kanban stage filter pills are in the lg:hidden mobile section — desktop tests must use .kanban-column h3 to avoid matching hidden elements
  - Won/Lost columns use bg-green-50/bg-red-50 as stable selectors since they have no h3 and are outside .kanban-column
duration: 
verification_result: passed
completed_at: 2026-04-29T20:09:30.041Z
blocker_discovered: false
---

# T01: Fixed BUG-1 (kanban labels), BUG-2 (contact detail selector), and BUG-4 (notification bell locale) — 6 tests now passing

**Fixed BUG-1 (kanban labels), BUG-2 (contact detail selector), and BUG-4 (notification bell locale) — 6 tests now passing**

## What Happened

Fixed BUG-2 (contact detail selector), BUG-4 (notification bell locale), and BUG-1 (kanban column labels) across crm.spec.js and notifications.spec.js. Five root issues resolved: (1) contact list button selector scoped to .overflow-y-auto to skip the 'Nuevo' header button; (2) label text assertion changed from 'text=EMAIL' to 'label:has-text(Email)' since CSS uppercase transform doesn't affect DOM; (3) notification bell aria-label changed to match 'Notification' (English) not just 'notification' (case-sensitive); (4) notification dropdown assertions made locale-agnostic with .or() chains; (5) kanban stage labels scoped to .kanban-column h3 to avoid hidden mobile filter pills; (6) won/lost columns matched by bg-green-50/bg-red-50 container classes.

## Verification

pnpm test:e2e --grep 'select a contact|status dropdown|notification bell|open notification|empty state|close dropdown|notification appears|kanban board|won/lost|navigate to Pipeline' --workers=1: 10 passed, 0 failed

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test:e2e --grep 'select a contact|status dropdown|notification bell|open notification|empty state|close dropdown|notification appears|kanban board|won/lost|navigate to Pipeline' --workers=1 --reporter=line` | 0 | ✅ pass (all 10 targeted tests pass after sequential fixes) | 87000ms |

## Deviations

BUG-2 fix also required correcting the label text assertion ('text=EMAIL' → 'label:has-text(\"Email\")' since CSS uppercase transform doesn't affect DOM text). BUG-4 also required fixing the notification dropdown text assertions (Notificaciones→OR Notifications) and the notification-creates-contact test (QuickAddMenu navigates but doesn't open form — used Nuevo button on contacts page instead). settings.spec.js 'search button in sidebar' test also moved from crm.spec.js Notes: sidebar search button text is locale-dependent, fixed to search for 'Buscar...' only — will revisit in S02 T04 full run.

## Known Issues

QuickAddMenu 'Contacto' item navigates to /?new=contact but index.js never reads that query param to open ContactForm — the quick-add contact flow is broken at the product level. Tracked for S02 T03 CRUD tests.

## Files Created/Modified

- `tests/e2e/crm.spec.js`
- `tests/e2e/notifications.spec.js`
