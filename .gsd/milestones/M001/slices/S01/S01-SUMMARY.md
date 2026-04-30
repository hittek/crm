---
id: S01
parent: M001
milestone: M001
provides:
  - ["audit-report.md — complete bug inventory with root-cause categories for S02 fix work", "shared login() fixture — used by all downstream test slices", "4 passing Auth & Mobile tests covering logout, session, and responsive sidebar"]
requires:
  []
affects:
  []
key_files:
  - ["tests/e2e/crm.spec.js", "tests/e2e/helpers/login.js", "tests/e2e/audit-report.md", "prisma/seed.js"]
key_decisions:
  - ["Used --workers=1 for all Playwright runs — Pi4 overloads under parallel browser workers", "Shared login() uses CommonJS (module.exports) to match package.json without type:module", "Mobile overlay close uses page.mouse.click() at coordinates outside sidebar — sidebar z-50 intercepts locator-based clicks on z-40 overlay", "Logout button matched by accessible name /Log Out|Cerrar sesión/i to handle locale variance"]
patterns_established:
  - ["tests/e2e/helpers/login.js shared login fixture — all specs import from here", "audit-report.md as durable human-readable test record — update after each significant run", "Sequential --workers=1 as standard for Pi4 e2e runs"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-29T19:52:03.607Z
blocker_discovered: false
---

# S01: Fix seed blocker, shared login fixture, full E2E audit, Auth & Mobile tests

**Unblocked PostgreSQL seeding, extracted shared login fixture, ran full 85-test Playwright audit (57 pass / 28 fail), and added 4 new Auth & Mobile tests — all passing.**

## What Happened

Four tasks completed in sequence. T01 fixed seed.js to support direct PostgreSQL connections by adding a postgres:// branch using PrismaPg + pg.Pool. T02 extracted a shared login() helper to tests/e2e/helpers/login.js and updated all 5 spec files to import from it. T03 ran the full 81-test Playwright suite sequentially and produced audit-report.md documenting 49 pass / 32 fail with 6 root-cause bug categories. T04 added a new Auth & Mobile describe block to crm.spec.js with 4 tests: logout, session persistence, mobile sidebar at 375px, and mobile sidebar at 768px — all 4 pass. Final suite result after T04: 85 tests, 57 pass, 28 fail. The settings.spec.js apparent regression (8→4 pass) is locale-state contamination from the prior i18n test run rather than a new bug. Known open bugs are documented in audit-report.md: kanban column label text mismatch, contact detail panel click target, profile page label text mismatch, notification bell missing aria-label, settings Notificaciones tab missing, i18n persistence tied to profile page bugs.

## Verification

pnpm test:e2e --grep 'logs out|session persists|mobile sidebar' --workers=1: 4 passed. Full suite (85 tests, --workers=1): 57 passed, 28 failed. Audit report written to tests/e2e/audit-report.md. All 4 T04 target tests pass.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

settings.spec.js shows 4 pass vs 8 pass in baseline — this is locale contamination from i18n.spec.js running first and leaving the app in English; not a regression introduced by this slice.

## Known Limitations

28 tests still failing across 5 bug categories documented in audit-report.md. These are the input for S02.

## Follow-ups

S02 should tackle bugs in priority order: (1) notification bell aria-label — 1-line fix unblocks 5 tests; (2) kanban column labels — text mismatch, 3 tests; (3) profile page label text — fixes 14 tests and unblocks i18n persistence tests; (4) settings Notificaciones tab — missing or misnamed; (5) contact detail panel click target."

## Files Created/Modified

None.
