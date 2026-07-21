---
id: T01
parent: S04
milestone: M008
key_files:
  - prisma/schema.prisma
  - lib/chatwoot.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:37:45.871Z
blocker_discovered: false
---

# T01: Schema fields added, 5 orgs backfilled with admin tokens, inbox helpers in lib/chatwoot.js

**Schema fields added, 5 orgs backfilled with admin tokens, inbox helpers in lib/chatwoot.js**

## What Happened

Added chatwootInboxId to ChannelConfig and chatwootAdminToken to Organization. Backfilled all 5 orgs. Added createChatwootInbox (creates inbox + links AgentBot) and deleteInbox helpers.

## Verification

node require check → both functions present

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node -e "const c=require('./lib/chatwoot'); console.log(typeof c.createChatwootInbox, typeof c.deleteInbox)"` | 0 | ✅ pass | 100ms |

## Deviations

Used ALTER TABLE for schema changes. Created per-account Chatwoot admin users via Rails runner due to complex password requirements.

## Known Issues

None.

## Files Created/Modified

- `prisma/schema.prisma`
- `lib/chatwoot.js`
