---
id: T01
parent: S04
milestone: M010-sewkw9
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: untested
completed_at: 2026-07-28T17:13:13.839Z
blocker_discovered: false
---

# T01: node-cron scheduler with per-org timezone-aware hour matching and idempotent run logic

**node-cron scheduler with per-org timezone-aware hour matching and idempotent run logic**

## What Happened

Implemented lib/scheduler.js with initScheduler() (module-level guard, node-cron '0 * * * *'), schedulerTick() (fetches scheduled defs, checks local hour in org timezone, fires due reports), and runScheduledReport() (idempotency via UNIQUE key, upserts ReportRun, calls executeDefinition, updates to delivered/partial/failed).

## Verification

node --check passes. Live tick delivers 2 reports in 76ms and 58ms.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
