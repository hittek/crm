---
id: S04
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
  - Scheduler initialised via health.js side-effect — no custom Next.js server needed, health is always hit on container start
  - runScheduledReport upserts ReportRun (not insert) so re-runs with force=true replace previous run rather than creating duplicates
  - force=false tick filters by local hour in org timezone — each org fires at its own configured hour
  - partial status for runs where some widgets errored — data is still usable
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-28T17:13:46.665Z
blocker_discovered: false
---

# S04: node-cron scheduler

**Hourly scheduler live: per-org timezone-aware cron, idempotent ReportRun persistence, manual tick endpoint**

## What Happened

Wired node-cron to fire at the top of every hour. The tick checks each ReportDefinition's schedule.hour against the current local time in the org's timezone, runs due reports via executeDefinition, and persists results to ReportRun with idempotent upsert. Manual tick endpoint enables testing and catch-up runs.

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

- `pages/api/health.js` — initScheduler() side-effect import added
- `lib/scheduler.js` — Hourly cron, schedulerTick, runScheduledReport with timezone-aware hour matching and idempotency
- `pages/api/internal/scheduler-tick.js` — Manual tick endpoint: full tick or single-report mode, force flag
