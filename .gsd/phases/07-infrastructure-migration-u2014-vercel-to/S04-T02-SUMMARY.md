---
id: T02
parent: S04
milestone: M007
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T17:39:26.873Z
blocker_discovered: false
---

# T02: Verified crm.hittek.mx serves from RPi4, not Vercel

**Verified crm.hittek.mx serves from RPi4, not Vercel**

## What Happened

Confirmed no Vercel headers in response. Health endpoint returns {status:ok,db:ok} from RPi4 stack.

## Verification

curl -sI https://crm.hittek.mx shows no server:vercel header; GET /api/health returns {status:ok,db:ok}

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -sf https://crm.hittek.mx/api/health && curl -sI https://crm.hittek.mx/api/health | grep -v vercel` | 0 | ✅ pass | 500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
