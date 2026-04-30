---
id: T04
parent: S01
milestone: M001
key_files:
  - tests/e2e/crm.spec.js
key_decisions:
  - Matched user menu button by accessible name 'AU Admin User' — more stable than CSS class selectors for dynamic components
  - Logout button text is locale-dependent; used regex /Log Out|Cerrar sesión/i to handle both EN and ES
  - Mobile overlay click uses page.mouse.click() at coordinates outside sidebar bounds rather than locator click — sidebar z-50 intercepts locator-based clicks on the z-40 overlay
  - Killed zombie Next.js processes occupying ports 3000/3001 from previous session before running tests
duration: 
verification_result: passed
completed_at: 2026-04-29T19:18:09.843Z
blocker_discovered: false
---

# T04: Added 4 new Auth & Mobile tests to crm.spec.js: logout, session persistence, mobile sidebar at 375px, mobile sidebar at 768px — all passing

**Added 4 new Auth & Mobile tests to crm.spec.js: logout, session persistence, mobile sidebar at 375px, mobile sidebar at 768px — all passing**

## What Happened

Added a new `test.describe('Auth & Mobile', ...)` block to crm.spec.js with 4 tests. Several selector issues required iterative debugging: (1) The user menu button needed matching by accessible name `AU Admin User` rather than CSS class selectors; (2) The logout button text is English `Log Out` not Spanish `Cerrar sesión` — the app locale defaults to English; (3) The mobile overlay click was intercepted by the z-50 sidebar, resolved by clicking at coordinates (310, 400) which lands in the overlay area to the right of the 256px sidebar; (4) The mobile 375 test needed the sidebar opened first — on first load at 375px the sidebar starts with `translate-x-0` because login() navigates to `/` at default viewport then setViewportSize runs after, so the sidebar was already open. Fixed by verifying the initial state after viewport change and login sequence. Port conflicts from zombie previous-session Next.js processes (3000/3001) also caused the initial test runs to hang — cleared those first.

## Verification

pnpm test:e2e --grep 'logs out|session persists|mobile sidebar' --workers=1 --reporter=line → 4 passed (51.7s)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test:e2e --grep 'logs out|session persists|mobile sidebar' --workers=1 --reporter=line` | 0 | ✅ pass | 58000ms |

## Deviations

None. All 4 planned tests added and passing.

## Known Issues

None.

## Files Created/Modified

- `tests/e2e/crm.spec.js`
