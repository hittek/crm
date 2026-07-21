---
id: T01
parent: S02
milestone: M008
key_files:
  - prisma/schema.prisma
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T19:53:41.419Z
blocker_discovered: false
---

# T01: Added chatwootAccountId + chatwootAgentBotId to Organization schema and applied to DB

**Added chatwootAccountId + chatwootAgentBotId to Organization schema and applied to DB**

## What Happened

Added chatwootAccountId and chatwootAgentBotId nullable Int fields to the Organization model. Copied updated schema into running container and ran prisma db push. Both columns confirmed present in PostgreSQL.

## Verification

SELECT column_name FROM information_schema.columns WHERE table_name='Organization' AND column_name LIKE 'chatwoot%' → 2 rows

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker exec hittek-crm-postgres psql -U crm -d crm_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='Organization' AND column_name LIKE 'chatwoot%';"` | 0 | ✅ pass — 2 rows: chatwootAccountId, chatwootAgentBotId | 200ms |

## Deviations

Used `prisma db push` via the /prisma-cli volume in the running container (same pattern as entrypoint) instead of migrate dev — no migration history files needed since the project uses db push throughout.

## Known Issues

None.

## Files Created/Modified

- `prisma/schema.prisma`
