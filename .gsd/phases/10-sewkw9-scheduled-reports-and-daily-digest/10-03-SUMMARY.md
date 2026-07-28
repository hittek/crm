---
id: S03
parent: M010-sewkw9
milestone: M010-sewkw9
provides:
  - (none)
requires:
  []
affects:
  []
key_files: []
key_decisions:
  - Per-widget errors are caught and returned as {error} entries — one bad widget doesn’t fail the response
  - POST /api/reports/preview/run (id=preview) skips DB lookup for live preview of unsaved definitions
  - Table widget renders as {columns, rows} matching the shape the UI will consume
  - groupBy uses Prisma’s native groupBy with proper aggregate key extraction per function type
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-28T17:04:22.798Z
blocker_discovered: false
---

# S03: Query executor and run endpoint

**Query executor and run endpoint live: DSL \u2192 Prisma \u2192 Recharts-ready data in <40ms**

## What Happened

Built the query execution layer. The executor translates the widget DSL into live Prisma queries, handles all aggregation patterns and time templates, and returns Recharts-ready data. Both saved reports and inline previews work via the run endpoint.

## Verification



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

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `lib/reports/executor.js` — Query executor: DSL→Prisma translation for all 6 entities, 5 aggregates, groupBy, filters, time templates
- `pages/api/reports/[id]/run.js` — GET+POST run endpoint: saved report by id and inline preview
