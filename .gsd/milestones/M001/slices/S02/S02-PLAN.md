# S02: Contacts CRUD Fix & Verification

**Goal:** Fix the 5 test selector/locale bugs identified in the audit report and verify the full contacts CRUD lifecycle end-to-end with Playwright.
**Demo:** After this: create a contact via the form (record appears in list), edit it (changes persist on reload), change status (updates in list and detail), delete it (removed from list) — all verified by Playwright

## Must-Haves

- crm.spec.js contact detail tests pass (BUG-2 selector fixed)\n- notifications.spec.js UI tests pass (BUG-4 aria-label locale fix)\n- kanban column label tests pass (BUG-1 text match fixed)\n- Full contacts CRUD lifecycle verified by Playwright: create → appears in list → edit → reload → confirm persisted → delete → removed from list\n- Net test pass count ≥ 70/85

## Proof Level

- This slice proves: Playwright suite --workers=1 passes for all targeted tests.

## Integration Closure

All fixed tests run clean in the full suite (--workers=1). No regressions against prior passing tests.

## Verification

- None — no new backend code.

## Tasks

- [x] **T01: Fix BUG-2 (contact detail selector) and BUG-4 (notification bell locale)** `est:30m`
  Two fast test fixes:
1. BUG-2: crm.spec.js 'should select a contact and show detail panel' and 'should show contact status dropdown in detail' use `page.locator('main button').first()` which hits the 'Nuevo contacto' button, not a contact row. Fix: use `page.locator('main .flex-1.overflow-y-auto button').first()` to scope to the scrollable contact list.
2. BUG-4: notifications.spec.js uses `button[aria-label*="Notificaciones"]` which fails in English locale. Fix: change to `button[aria-label*="Notificaciones"], button[aria-label*="Notifications"]` or use a regex `button[aria-label]` scoped to aside. Update all 5 notification UI tests that depend on finding the bell.
  - Files: `tests/e2e/crm.spec.js`, `tests/e2e/notifications.spec.js`
  - Verify: pnpm test:e2e --grep 'select a contact|status dropdown|notification bell|open notification|empty state|close dropdown' --workers=1 --reporter=line 2>&1 | tail -10

- [x] **T02: Fix BUG-1 (kanban column label text mismatch)** `est:30m`
  crm.spec.js Pipeline tests look for 'text=Lead', 'text=Calificado', 'text=Propuesta', 'text=Negociación', 'text=Ganado', 'text=Perdido'. Check what text is actually rendered in components/deals/Pipeline.js column headers. The seed data sets stage names — grep for the actual values and either fix the test selectors to match reality or (if the stage names are wrong) fix the seed/component. Also check navigation test 'should navigate to Pipeline page' which waits for 'text=Lead'.
  - Files: `tests/e2e/crm.spec.js`, `components/deals/Pipeline.js`, `prisma/seed.js`
  - Verify: pnpm test:e2e --grep 'kanban board|won/lost|navigate to Pipeline' --workers=1 --reporter=line 2>&1 | tail -10

- [x] **T03: Add contacts CRUD Playwright tests** `est:1h`
  Add a new test.describe('Contacts CRUD', ...) block to crm.spec.js covering the full lifecycle:
1. Create contact: click 'Nuevo' button in contact list header, fill firstName='Test', lastName='Contact', email='test.contact@example.com', submit, assert contact appears in list
2. Edit contact: click the newly created contact, wait for detail panel, find edit button, change company to 'ACME Corp', save, assert updated value visible in detail
3. Status change: in the detail panel, change status select to a non-active value, assert chip updates in the list
4. Delete contact: find delete button in detail panel, click, confirm dialog, assert contact removed from list
All steps import login() from ./helpers/login. Each sub-test is independent (uses beforeEach with login + fresh contact creation where needed) to avoid order dependency.
  - Files: `tests/e2e/crm.spec.js`, `components/contacts/ContactDetail.js`
  - Verify: pnpm test:e2e --grep 'Contacts CRUD' --workers=1 --reporter=line 2>&1 | tail -10

- [x] **T04: Update audit report and run full suite** `est:30m`
  Run full Playwright suite (--workers=1) after all fixes. Update tests/e2e/audit-report.md with new pass/fail counts and revised bug category status (mark fixed bugs as FIXED). Confirm net count ≥ 70/85.
  - Files: `tests/e2e/audit-report.md`
  - Verify: pnpm test:e2e --workers=1 --reporter=line 2>&1 | tail -5

## Files Likely Touched

- tests/e2e/crm.spec.js
- tests/e2e/notifications.spec.js
- components/deals/Pipeline.js
- prisma/seed.js
- components/contacts/ContactDetail.js
- tests/e2e/audit-report.md
