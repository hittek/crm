---
id: T04
parent: S02
milestone: M010-sewkw9
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-28T16:58:28.999Z
blocker_discovered: false
---

# T04: Deployed and verified: 401 guard, 400 guard, valid build, and save=true DB persistence all work

**Deployed and verified: 401 guard, 400 guard, valid build, and save=true DB persistence all work**

## What Happened

All three smoke tests pass. save=true created DB row id=3 with correct organizationId=3 and createdBy=9. tokensUsed logged per call.

## Verification

Verification evidence recorded: `curl no-auth POST /api/reports/build` exited 0 (✅ {"error":"Unauthorized"}); `curl with session, no prompt` exited 0 (✅ {"error":"prompt is required"}); `curl valid prompt (6 widgets, 2461 tokens)` exited 0 (✅ definition.widgets.length === 6); 1 more check(s) recorded.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl no-auth POST /api/reports/build` | 0 | ✅ {"error":"Unauthorized"} | 200ms |
| 2 | `curl with session, no prompt` | 0 | ✅ {"error":"prompt is required"} | 200ms |
| 3 | `curl valid prompt (6 widgets, 2461 tokens)` | 0 | ✅ definition.widgets.length === 6 | 4200ms |
| 4 | `curl save=true (id:3 in DB, isBuiltIn:false, createdBy:9)` | 0 | ✅ id:3 confirmed in psql | 4500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
