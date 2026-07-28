---
id: S01
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
  - orgId unified to organizationId across entire codebase — 11 DB tables, 35+ source files
  - Report registry uses self-registration pattern (import side effect) — adding a report requires only one file
  - ReportRun UNIQUE(reportId, organizationId, windowKey) enforces idempotency at DB level
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-28T16:41:01.374Z
blocker_discovered: false
---

# S01: Report data models and registry skeleton

**Report framework skeleton live: models, registry, daily-digest generator, internal trigger endpoint, and full orgId→organizationId rename**

## What Happened

Built the full report framework skeleton. Migrated two DB tables, implemented base class and registry, built the first concrete report (daily digest with 6 widgets), and wired an internal trigger endpoint. Bonus: cleaned up the orgId/organizationId inconsistency that had existed across the schema.

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

orgId→organizationId rename was added to this slice (not in original plan) — discovered during T03 when Conversation model broke. Cleaned up all 11 models and ~35 files in the same slice to keep the codebase consistent.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `prisma/schema.prisma` — Added ReportDefinition and ReportRun models; renamed orgId→organizationId in all 11 models
- `prisma/migrations/20260728_add_report_models/migration.sql` — DB migration: create ReportDefinition, ReportRun, seed built-in report
- `prisma/migrations/20260728_rename_orgid_to_organizationid/migration.sql` — DB migration: rename orgId→organizationId in 11 tables
- `lib/reports/base.js` — Report base class, WidgetType enum, ENTITY_FIELDS whitelist, TIME_TEMPLATES, buildDailyWindow
- `lib/reports/registry.js` — ReportRegistry singleton
- `lib/reports/index.js` — Public entry point; bootstraps built-in reports
- `lib/reports/daily-digest.js` — Built-in daily digest with 6 widgets; self-registers in registry
- `pages/api/internal/run-report.js` — Internal trigger endpoint with auth guard and idempotency
