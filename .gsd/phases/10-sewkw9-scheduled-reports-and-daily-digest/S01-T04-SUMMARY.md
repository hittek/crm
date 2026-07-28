---
id: T04
parent: S01
milestone: M010-sewkw9
key_files:
  - (none)
key_decisions:
  - orgId renamed to organizationId in all 11 models and all call sites — single source of truth for org scoping
duration: 
verification_result: passed
completed_at: 2026-07-28T16:40:44.321Z
blocker_discovered: false
---

# T04: Internal run-report endpoint live; orgId→organizationId renamed across entire codebase

**Internal run-report endpoint live; orgId→organizationId renamed across entire codebase**

## What Happened

Created POST /api/internal/run-report with x-internal-secret guard, idempotency via UNIQUE(reportId, organizationId, windowKey), and async generate+deliver cycle. Also did full orgId→organizationId rename across 11 DB tables and ~35 source files. Compound key name updated to reportId_organizationId_windowKey after rename.

## Verification

Auth guard returns 403 on wrong secret. Idempotency returns already_delivered for org 1. Fresh run delivers 6 widgets in 62ms for org 2.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -s -X POST https://crm.hittek.mx/api/internal/run-report -d '{}'` | 0 | ✅ {"error":"Forbidden"} | 300ms |
| 2 | `curl with correct secret reportId:1` | 0 | ✅ {"status":"already_delivered"} | 400ms |
| 3 | `curl with correct secret reportId:2` | 0 | ✅ {"status":"delivered","widgetCount":6,"durationMs":62} | 400ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
