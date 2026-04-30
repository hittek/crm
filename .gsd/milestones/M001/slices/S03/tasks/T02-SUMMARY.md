---
id: T02
parent: S03
milestone: M001
key_files:
  - tests/e2e/crm.spec.js
  - pages/deals.js
key_decisions:
  - DealForm expects isOpen+onSave props but deals.js was passing onSubmit without isOpen — product bug fixed
  - handleFormSubmit should not re-call the API since DealForm already does the API call in handleSubmit
  - Drawer 'Close' button (aria-label='Close') is the reliable signal that drawer is open
  - Scope deal title assertions to .fixed.inset-y-0.right-0 (the drawer panel) to avoid matching hidden kanban card h3 elements
duration: 
verification_result: passed
completed_at: 2026-04-29T21:32:19.476Z
blocker_discovered: false
---

# T02: Added 3 deals pipeline CRUD tests (create, drawer open, stage change) and fixed the DealForm prop mismatch product bug

**Added 3 deals pipeline CRUD tests (create, drawer open, stage change) and fixed the DealForm prop mismatch product bug**

## What Happened

Added 3 Deals Pipeline CRUD tests: create deal (form opens, filled, submitted, appears in Lead column), open drawer (click kanban card, close button visible, deal title visible in drawer panel), change stage (select different stage value, auto-saves). Also fixed product bug: DealForm was broken because deals.js passed wrong prop names (onSubmit instead of onSave, missing isOpen). The modal was never opening in the real app either. All 3 tests pass together in 96.5s.

## Verification

pnpm test:e2e --grep 'Deals Pipeline CRUD' --workers=1: 3 passed (96.5s)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test:e2e --grep 'Deals Pipeline CRUD' --workers=1 --reporter=line` | 0 | ✅ pass | 96500ms |

## Deviations

Also fixed a product bug in pages/deals.js: DealForm was receiving onSubmit (wrong prop name) and isOpen was missing, so the Modal never opened. Fixed to pass isOpen={showForm} and onSave={handleFormSubmit}. Also simplified handleFormSubmit to just update state since DealForm handles the API call itself.

## Known Issues

Stage change test is slightly order-sensitive — passes in isolation and in sequential run but the first kanban card changes each run. Stable enough for CI.

## Files Created/Modified

- `tests/e2e/crm.spec.js`
- `pages/deals.js`
