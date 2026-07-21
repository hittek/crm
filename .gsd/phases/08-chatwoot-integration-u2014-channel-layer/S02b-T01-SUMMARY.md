---
id: T01
parent: S02b
milestone: M008
key_files:
  - lib/chatwoot.js
  - pages/api/admin/orgs.js
  - pages/api/auth/signup.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:04:52.477Z
blocker_discovered: false
---

# T01: Admin org creation + ensureOrgProvisioned helper wired — all creation paths provision Chatwoot

**Admin org creation + ensureOrgProvisioned helper wired — all creation paths provision Chatwoot**

## What Happened

Added ensureOrgProvisioned (idempotent) and updateAgentBot to lib/chatwoot.js. Added POST /api/admin/orgs for admin org creation with auto-provisioning. Refactored signup.js to use ensureOrgProvisioned.

## Verification

node require check → ensureOrgProvisioned and updateAgentBot both functions

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node -e "const c = require('./lib/chatwoot'); console.log(typeof c.ensureOrgProvisioned, typeof c.updateAgentBot)"` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `lib/chatwoot.js`
- `pages/api/admin/orgs.js`
- `pages/api/auth/signup.js`
