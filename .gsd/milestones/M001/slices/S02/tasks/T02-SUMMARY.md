---
id: T02
parent: S02
milestone: M001
key_files:
  - tests/e2e/crm.spec.js
key_decisions:
  - Kanban column headers are h3 inside .kanban-column for active stages
  - Won/Lost sections are separate divs with bg-green-50/bg-red-50 — no h3 present
duration: 
verification_result: passed
completed_at: 2026-04-29T20:09:41.547Z
blocker_discovered: false
---

# T02: Fixed BUG-1 kanban column label selectors — all 3 pipeline/navigation tests now pass

**Fixed BUG-1 kanban column label selectors — all 3 pipeline/navigation tests now pass**

## What Happened

Kanban column stage labels (BUG-1) fixed by scoping locators to .kanban-column h3 to avoid matching hidden mobile filter pills. Won/Lost columns matched by their container background color classes. Navigation-to-Pipeline test updated to use the same .kanban-column h3 selector.

## Verification

pnpm test:e2e --grep 'kanban board|won/lost|navigate to Pipeline|won/lost' --workers=1: all 3 pass

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test:e2e --grep 'kanban board|won/lost|navigate to Pipeline' --workers=1 --reporter=line` | 0 | ✅ pass | 27700ms |

## Deviations

T01 absorbed the kanban fix work. T02 is complete — kanban labels now use .kanban-column h3 selectors and won/lost use bg-green-50/bg-red-50 container classes.

## Known Issues

None.

## Files Created/Modified

- `tests/e2e/crm.spec.js`
