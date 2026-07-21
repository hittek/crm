---
id: T04
parent: S02
milestone: M008
key_files:
  - scripts/backfill-chatwoot.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T19:55:44.565Z
blocker_discovered: false
---

# T04: Backfilled all 5 existing orgs with Chatwoot accounts + AgentBots

**Backfilled all 5 existing orgs with Chatwoot accounts + AgentBots**

## What Happened

Provisioned all 5 existing orgs: Mi Empresa Test→account 1, Acme MX→2, TestCorp E2E→3, Test123→4, Homeblinds→5. Each has a matching AgentBot with webhook URL pointing to /api/chatbot/agentbot/{slug}.

## Verification

SELECT chatwootAccountId, chatwootAgentBotId FROM Organization → all 5 rows populated

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker exec hittek-crm-postgres psql -U crm -d crm_db -c 'SELECT id, name, "chatwootAccountId", "chatwootAgentBotId" FROM "Organization" ORDER BY id;'` | 0 | ✅ pass — 5/5 orgs provisioned | 200ms |

## Deviations

Ran backfill via bash+psql+wget inside Docker containers instead of node script (production container has no source files). The script in scripts/backfill-chatwoot.js is kept for future local dev use.

## Known Issues

None.

## Files Created/Modified

- `scripts/backfill-chatwoot.js`
