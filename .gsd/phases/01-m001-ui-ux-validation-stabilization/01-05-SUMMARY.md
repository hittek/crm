---
id: S05
milestone: M001
status: complete
started_at: 2026-04-30
completed_at: 2026-04-30
tests_before: 86/96
tests_after: 96/96
---

# S05 Summary: Settings, Reports & Mobile Polish

## What shipped

**BUG-3 fixed** — Profile page tests were failing in isolation because Playwright's browser defaults to `en-US`, and without prior localStorage state the i18n hook resolves English. Added `resetLocale()` to `beforeEach` in profile.spec.js and settings.spec.js. Also fixed the "should change locale" restore step to handle post-locale-switch English button text.

**BUG-5 fixed** — The Notificaciones settings tab was missing entirely from settings.js: no state, no tab button, no content. Added:
- `notifications` state with all expected fields (`taskReminders`, `newContacts`, `dealsWon`, `dealUpdates`, `dailyDigest`)
- "Notificaciones" tab entry in the tabs array (using `Icons.bell`)
- Full tab content with toggle switches and a save button wired to `saveSettings('notifications', notifications)`
- API defaults updated to include `newContacts` and `dealsWon` keys
- Scoped "Notificaciones" `getByRole` queries to `page.locator('main')` in crm.spec.js and settings.spec.js to avoid strict-mode collision with the global notification bell (same aria-label)

## Result

**96/96 tests passing (100%)** — M001 success criteria met.
