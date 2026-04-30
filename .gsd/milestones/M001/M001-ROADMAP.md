# M001: UI/UX Validation & Stabilization

**Vision:** Prove that every existing CRM interaction actually works — not just renders. Discover and fix all broken buttons, form submissions, drag-drop, and modal actions. Replace visibility-only Playwright tests with action-verification tests that catch real breakage. The CRM must be demonstrably solid before any SaaS or chatbot work builds on top of it.

## Success Criteria

- Full contact lifecycle works end-to-end: create → edit → status change → delete
- Full deal lifecycle works: create → drag to new stage → edit → mark won
- Full task lifecycle works: create → edit → mark complete → filter by status
- All settings tabs save and persist values across page reload
- Playwright suite runs clean — zero failures, zero skipped tests
- Mobile layout verified at 375px and 768px for all major pages

## Slices

- [x] **S01: S01** `risk:high` `depends:[]`
  > After this: After this: login/logout works, all nav links navigate correctly, sidebar collapses on mobile, and a complete audit report lists every broken interaction found

- [x] **S02: S02** `risk:high` `depends:[]`
  > After this: After this: create a contact via the form (record appears in list), edit it (changes persist on reload), change status (updates in list and detail), delete it (removed from list) — all verified by Playwright

- [x] **S03: S03** `risk:high` `depends:[]`
  > After this: After this: create a deal (appears in correct kanban column), drag it to a new stage (DB updated), open the deal drawer (all fields load), and mark it won — all verified by Playwright including the drag-drop

- [x] **S04: Tasks & Modal Forms Fix & Verification** `risk:medium` `depends:[S01]`
  > After this: After this: create a task (appears in list), mark it complete (moves to completed filter), use quick-add menu to create a contact/deal/task, and open/submit every modal form in the app without any broken submit buttons

- [ ] **S05: Settings, Reports & Mobile Polish** `risk:low` `depends:[S01]`
  > After this: After this: save organization name, switch currency, add a pipeline stage, toggle a notification — all persist on reload. Reports page shows real data. All pages render correctly at 375px and 768px.

## Boundary Map

### S01 → S02, S03, S04, S05

Produces:
- Working login/logout with iron-session verified
- Stable test helper: `login(page)` function reusable across all subsequent slices
- Audit report: complete list of broken interactions per page (input to S02–S05 fix work)
- Verified nav routing for all 5 main pages

Consumes:
- nothing (first slice)

### S02 → downstream milestones

Produces:
- Verified /api/contacts and /api/contacts/[id] endpoints working correctly
- Playwright test patterns for CRUD verification (create → confirm in list → reload → confirm persisted)
- Fixed contact form submission handler
- Fixed contact status change handler

Consumes from S01:
- login(page) test helper
- Audit report for contacts-related broken interactions

### S03 → downstream milestones

Produces:
- Verified /api/deals and /api/deals/[id] endpoints working correctly
- Playwright drag-drop pattern for kanban (reusable in future tests)
- Fixed deal drag-drop handler (DB write on drop)
- Fixed deal drawer form submission

Consumes from S01:
- login(page) test helper
- Audit report for pipeline-related broken interactions

### S04 → downstream milestones

Produces:
- Verified /api/tasks and /api/tasks/[id] endpoints working correctly
- Verified quick-add menu creates all entity types
- Fixed modal form submit handlers across the app

Consumes from S01:
- login(page) test helper
- Audit report for task/modal broken interactions

### S05 → downstream milestones

Produces:
- Verified /api/settings endpoint working correctly
- Verified reports /api/reports/dashboard loading real data
- Confirmed responsive breakpoints (375px, 768px) across all pages
- Stable seed data that survives re-seed without breaking test assertions

Consumes from S01:
- login(page) test helper
- Audit report for settings-related broken interactions
