---
id: S02
parent: M001
milestone: M001
provides:
  - ["Fixed crm.spec.js selectors for kanban, contact detail, navigation", "Fixed notifications.spec.js for both locales", "3 passing Contacts CRUD Playwright tests", "BUG-7 locale contamination root cause documented in audit-report.md"]
requires:
  []
affects:
  []
key_files:
  - ["tests/e2e/crm.spec.js", "tests/e2e/notifications.spec.js", "tests/e2e/audit-report.md"]
key_decisions:
  - ["CSS text-transform uppercase does not affect Playwright text locators \u2014 always match DOM text", "InlineEdit requires clicking the span[role=button] to activate edit mode before filling", "Scope .not.toBeVisible assertions to specific containers to avoid strict-mode violations when element appears in multiple places", "Locale contamination is a test infra structural issue \u2014 fix is adding localStorage reset in beforeEach, not modifying test logic"]
patterns_established:
  - ["CSS text-transform doesn't affect Playwright locators \u2014 match actual DOM text", "InlineEdit: click span[role=button] aria-label='Edit X' first, then fill input.input-inline", "Scope not.toBeVisible to a container when element may appear in multiple places on page"]
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-04-29T20:51:02.031Z
blocker_discovered: false
---

# S02: Contacts CRUD Fix & Verification

**Fixed 3 bug categories (10 tests), added 3 CRUD tests, identified locale contamination as new BUG-7 — all targeted tests pass in isolation**

## What Happened

Fixed BUG-1 (kanban labels, 3 tests), BUG-2 (contact detail selector, 2 tests), BUG-4 (notification bell locale, 5 tests). Added 3 contacts CRUD tests (create, inline edit, delete). Identified BUG-7 (locale contamination across spec files). Full suite: 57/88 pass — absolute pass count stable, structural contamination issue documented for S03.

## Verification

All targeted tests pass in isolation. Full suite: 57/88 (notifications 8/8, CRUD 3/3, kanban 3/3, contact detail 2/2). audit-report.md updated.

## Requirements Advanced

- R001 — Contacts CRUD lifecycle verified by Playwright: create, edit, delete all passing

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Target of ≥70/88 not met (57/88 pass). The gap is locale contamination (BUG-7) where i18n.spec.js leaves app in English, causing Spanish-text assertions in subsequent files to fail. This is a test infrastructure issue, not a product bug.

## Known Limitations

BUG-7 locale contamination: ~6 tests fail when run after i18n.spec.js in full suite. BUG-3 (profile page, 14 tests) and BUG-6 (i18n persistence) still open. QuickAddMenu 'Contacto' item navigates to /?new=contact but index.js never opens the form — product bug not yet fixed.

## Follow-ups

S03 should fix BUG-7 (add locale-reset to beforeEach in affected specs), then tackle BUG-3 (profile page labels) and BUG-5 (settings Notificaciones tab). Together these should push pass rate past 75/88.

## Files Created/Modified

None.
