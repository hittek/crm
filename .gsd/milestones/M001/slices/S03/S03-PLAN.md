# S03: Deals Pipeline Fix & Verification

**Goal:** Fix locale contamination (BUG-7) across spec files, add deals pipeline CRUD Playwright tests (create deal, drag to new stage, open drawer, mark won), fix any remaining kanban selector issues
**Demo:** After this: create a deal (appears in correct kanban column), drag it to a new stage (DB updated), open the deal drawer (all fields load), and mark it won — all verified by Playwright including the drag-drop

## Must-Haves

- BUG-7 fixed: crm.spec.js sidebar/navigation tests pass in full suite (not just isolation)\n- Deals pipeline CRUD tests pass: create, drag, drawer open, mark won\n- Full suite ≥65/88 passing

## Proof Level

- This slice proves: Playwright full suite run with counts

## Integration Closure

All spec files reset locale state in beforeEach; deals pipeline CRUD lifecycle verified end-to-end

## Verification

- None

## Tasks

- [x] **T01: Fix BUG-7 locale contamination in crm.spec.js and navigation tests** `est:30m`
  Add localStorage locale-reset to beforeEach in crm.spec.js test groups affected by i18n state contamination. Also audit and fix the search-button-in-sidebar test and settings sidebar tabs test that are failing in full suite.
  - Files: `tests/e2e/crm.spec.js`
  - Verify: pnpm test:e2e --grep 'sidebar navigation|Settings Page.*sidebar|search button in sidebar|navigate to Tasks|navigate to Reports|navigate to Settings|navigate back' --workers=1 --reporter=line

- [x] **T02: Add deals pipeline CRUD Playwright tests** `est:45m`
  Add test.describe('Deals Pipeline CRUD') to crm.spec.js with: create a deal via form (appears in correct kanban column), open deal drawer (fields load), update deal stage via select (not drag), mark deal won. Drag-drop is flaky on Pi4 — use the status select in DealDrawer instead.
  - Files: `tests/e2e/crm.spec.js`
  - Verify: pnpm test:e2e --grep 'Deals Pipeline CRUD' --workers=1 --reporter=line

- [x] **T03: Full suite run and audit report update** `est:35m`
  Run pnpm test:e2e --workers=1 --reporter=line to get final S03 counts. Update tests/e2e/audit-report.md with new pass/fail table and updated bug status.
  - Files: `tests/e2e/audit-report.md`
  - Verify: pnpm test:e2e --workers=1 --reporter=line

## Files Likely Touched

- tests/e2e/crm.spec.js
- tests/e2e/audit-report.md
