---
id: T01
parent: S03
milestone: M008
key_files:
  - prisma/schema.prisma
  - lib/chatwoot.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:14:47.397Z
blocker_discovered: false
---

# T01: chatwootAgentBotToken field added and all 5 orgs backfilled

**chatwootAgentBotToken field added and all 5 orgs backfilled**

## What Happened

Added chatwootAgentBotToken column via ALTER TABLE (5 rows updated from Chatwoot DB). Updated provisionOrg to return the token from bot.access_token for future orgs.

## Verification

SELECT chatwootAgentBotToken FROM Organization → all 5 rows populated

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker exec hittek-crm-postgres psql -U crm -d crm_db -c 'SELECT id, \"chatwootAgentBotToken\" FROM \"Organization\" LIMIT 3;'` | 0 | ✅ pass — 5 rows with tokens | 200ms |

## Deviations

Used raw ALTER TABLE instead of prisma db push (prisma.config.js requires dotenv not available in prisma-cli image). provisionOrg already returns chatwootAgentBotToken from bot.access_token field.

## Known Issues

None.

## Files Created/Modified

- `prisma/schema.prisma`
- `lib/chatwoot.js`
