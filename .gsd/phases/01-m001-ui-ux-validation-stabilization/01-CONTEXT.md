# M001: UI/UX Validation & Stabilization

**Gathered:** 2026-04-28
**Status:** Ready for planning

## Project Description

Hittek CRM is an existing Next.js 14 + Prisma + PostgreSQL CRM with contacts, deals, tasks, pipeline, activities, notifications, multi-tenancy, and role-based auth. The codebase is functional but has broken UI interactions — buttons and actions that render correctly but don't work. The existing Playwright e2e tests check visibility only, not actual behavior.

## Why This Milestone

The CRM is the foundation everything else is sold on. M002 through M006 add SaaS billing, chatbots, and integrations on top of this base — but if the base has broken interactions, every demo will fail. M001 must be done before anything else ships.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Create, edit, delete, and update contacts without any broken interactions
- Drag deals between pipeline stages, create and close deals from the kanban board
- Create, edit, complete, and filter tasks via all available UI controls
- Save and persist settings changes across all settings tabs
- Use all modal forms, quick-add menu, and search without broken buttons

### Entry point / environment

- Entry point: `http://localhost:3000` (local dev)
- Environment: local dev — `pnpm dev` + seeded PostgreSQL
- Live dependencies involved: PostgreSQL (local), none external

## Completion Class

- Contract complete means: All Playwright e2e tests pass covering CRUD operations, form submissions, modal actions, drag-drop, and settings saves
- Integration complete means: All interactions wired end-to-end — API routes respond correctly to UI actions, DB state updates as expected
- Operational complete means: none (local demo target)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A full contact lifecycle: create → edit → view detail → change status → delete
- A full deal lifecycle: create → drag to new stage → edit → mark won
- A full task lifecycle: create → edit → mark complete → filter by status
- All settings tabs save and persist across page reload
- Playwright suite runs clean — zero failures, zero skipped tests

## Architectural Decisions

### Test Strategy: Action Verification Not Visibility

**Decision:** Playwright tests must verify actual DOM/API state changes after interactions, not just that elements are visible.

**Rationale:** The existing test suite passes because it only checks `toBeVisible()`. The known broken buttons all render fine — they just don't trigger the right handler. Tests must verify the outcome: record count changed, form closed, status updated, DB state confirmed.

**Alternatives Considered:**
- Keep existing visibility-only tests and add separate action tests — creates two test suites with unclear ownership, fragile to maintain

### Bug Fix Scope: Fix Root Cause, Not Symptoms

**Decision:** When a broken button is discovered, fix the root cause in the component handler — never add a guard or console.log to suppress the error.

**Rationale:** Symptom fixes leave invisible landmines that surface under slightly different conditions. Root-cause fixes reduce future bug surface.

**Alternatives Considered:**
- Document bugs and defer to separate fix milestone — unacceptable, broken CRM can't be the foundation for a SaaS product

## Error Handling Strategy

Standard defaults apply. API errors surface as inline error messages in the UI. Form validation errors shown inline. No silent failures — if a CRUD operation fails, the user sees a clear message and the UI does not update state as if it succeeded.

## Risks and Unknowns

- Extent of broken interactions is unknown until audit — could be 2 buttons or 20
- Some broken interactions may reveal API bugs, not just frontend handler issues
- Drag-drop (pipeline kanban) is stateful and historically fragile in e2e tests

## Existing Codebase / Prior Art

- `tests/e2e/crm.spec.js` — existing e2e suite, visibility-only tests, login helper pattern to reuse
- `tests/e2e/settings.spec.js` — more complete settings tests, includes some save/persist verification
- `tests/e2e/test.config.js` — test credentials, seed user `admin@hittek.com`
- `prisma/seed.js` — seed data, must be seeded before e2e runs
- `playwright.config.js` — configured for `localhost:3000`, `pnpm dev` web server, Chromium only
- `components/deals/Pipeline.js` — kanban drag-drop implementation, likely source of drag bugs
- `pages/index.js` — contacts page, contact list + detail panel
- `pages/tasks.js` — tasks page with filter tabs

## Relevant Requirements

- R001 — CRM Core Flows Validated (primary)
- R002 — UI Interaction Bug Fixes (primary)
- R030 — Responsive/Mobile-ready Web App (cross-cutting — verify at 375px and 768px)

## Scope

### In Scope

- Full Playwright e2e coverage for all CRUD operations across contacts, deals, tasks
- All modal forms, quick-add menu, global search, notification interactions
- Settings: all tabs, all save operations, pipeline stage CRUD, notification toggles
- Discovering and fixing broken button/interaction bugs
- Mobile responsiveness verification at 375px and 768px

### Out of Scope / Non-Goals

- Adding new features or UI improvements
- Performance optimization
- API test coverage expansion (Jest tests are separate and already passing)
- Auth flow changes

## Technical Constraints

- Tests run against `localhost:3000` with seeded data — no mocking of API routes
- Seed data must be stable enough that test assertions don't break on re-seed
- Playwright configured for Chromium only — no cross-browser testing in this milestone

## Integration Points

- PostgreSQL (local) — all CRUD operations hit real DB via Prisma
- iron-session — login helper in tests must stay in sync with auth implementation

## Testing Requirements

Playwright e2e tests covering:
- Every CRUD flow end-to-end (not just visibility)
- Form submission → success/error state
- Modal open → fill → submit → modal closed + record updated
- Drag-drop → card in new column → DB stage updated
- Settings save → page reload → values persisted
- Mobile layout at 375px and 768px for all major pages

## Acceptance Criteria

**S01 (Auth & Navigation):** Login, logout, session persistence, all nav links navigate correctly, sidebar collapses on mobile

**S02 (Contacts CRUD):** Create contact (form submits, record appears in list), edit contact (changes persist), delete contact (record removed), status change (updates in list and detail panel), contact detail interactions (activity timeline loads, deals/tasks linked)

**S03 (Deals Pipeline):** Create deal (appears in correct stage column), drag deal to new stage (DB updated, card in new column), open deal drawer (all fields load), edit deal (changes persist), mark won/lost (deal moves to correct column)

**S04 (Tasks & Modals):** Create task (appears in list), edit task (changes persist), mark complete (status updates, moves to completed filter), filter tabs switch correctly, quick-add menu creates records, all modal forms submit without error

**S05 (Settings & Reports):** All settings tabs navigate without error, save operations persist across reload, pipeline stage add/edit/delete works, notification toggles save, reports page loads data

## Open Questions

- Pipeline drag-drop may need special Playwright handling (dragTo or mouse event simulation) — verify during S03
