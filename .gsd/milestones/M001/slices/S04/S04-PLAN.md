# S04: Tasks & Modal Forms Fix & Verification

**Goal:** Prove the full task lifecycle works end-to-end, verify quick-add navigation opens the correct form, and fix any broken modal submit handlers discovered along the way.
**Demo:** After this: create a task via "Nueva tarea" button (appears in Hoy/Próximas filter), mark it complete (moves to Completadas), use N-key quick-add menu to navigate to tasks/deals/contacts page with the form auto-opening, and submit a contact/deal/task form via quick-add — all verified by Playwright.

## Must-Haves

- Task CRUD: create via button (appears in list), mark complete (moves to Completadas filter)
- Quick-add navigation: N key → click each option → correct page loads with form auto-open
- Fix `?new=task`, `?new=deal`, `?new=contact` URL param handling in pages/tasks.js, pages/deals.js, pages/index.js
- Full suite ≥82/91 passing (net gain ≥1)

## Proof Level

- This slice proves: Playwright full suite run with counts

## Integration Closure

Task lifecycle covers: create → verify in list → mark complete → verify in Completadas. Quick-add covers: N key → menu open → select item → page loads → form visible.

## Verification

- None

## Tasks

- [ ] **T01: Fix URL param auto-open for quick-add targets** `est:30m`
  pages/tasks.js: add `useEffect` watching `router.query.new === 'task'` → call `handleNewTask()`.
  pages/deals.js: same pattern for `?new=deal`.
  pages/index.js: same pattern for `?new=contact`.
  All three already have the `showForm` + `handleNew*` pattern — just need to wire the URL param.
  - Files: `pages/tasks.js`, `pages/deals.js`, `pages/index.js`
  - Verify: navigate to /tasks?new=task in browser → TaskForm opens automatically

- [ ] **T02: Add Tasks CRUD Playwright tests** `est:40m`
  Add `test.describe('Tasks CRUD')` to crm.spec.js:
  1. Create a task via "Nueva tarea" button (title = unique timestamp name), submit form → appears in Hoy or Próximas list
  2. Mark task complete → moves to Completadas filter
  3. Quick-add N key → click "Tarea" → /tasks?new=task loads → TaskForm is visible
  4. Quick-add N key → click "Oportunidad" → /deals?new=deal loads → DealForm is visible
  5. Quick-add N key → click "Contacto" → /?new=contact loads → ContactForm is visible
  - Files: `tests/e2e/crm.spec.js`
  - Verify: pnpm test:e2e --grep 'Tasks CRUD' --workers=1 --reporter=line

- [ ] **T03: Full suite run and audit report update** `est:20m`
  Run full suite. Update tests/e2e/audit-report.md with S04 results.
  - Files: `tests/e2e/audit-report.md`
  - Verify: npx playwright test --workers=1 --reporter=line

## Files Likely Touched

- pages/tasks.js
- pages/deals.js
- pages/index.js
- tests/e2e/crm.spec.js
- tests/e2e/audit-report.md
