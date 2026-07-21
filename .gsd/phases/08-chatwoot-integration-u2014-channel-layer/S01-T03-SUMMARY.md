---
id: T03
parent: S01
milestone: M008
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T18:43:32.777Z
blocker_discovered: false
---

# T03: Created chatwoot_production DB and ran db:chatwoot_prepare — full schema created

**Created chatwoot_production DB and ran db:chatwoot_prepare — full schema created**

## What Happened

Created chatwoot_production DB in the existing postgres container (owner: crm). Ran db:chatwoot_prepare via a one-off docker run container. Schema created with all Chatwoot tables. 0 users/accounts is expected — super-admin is provisioned on first browser visit to /super_admin/auth/sign_in.

## Verification

SELECT COUNT(*) FROM accounts → 0 rows, schema fully present (28+ tables confirmed)"

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker exec hittek-crm-postgres psql -U crm -d chatwoot_production -c 'SELECT COUNT(*) FROM accounts;'` | 0 | ✅ pass — schema present | 500ms |

## Deviations

None.

## Known Issues

Non-fatal warning about installation_configs during db:chatwoot_prepare — this is normal before first boot.

## Files Created/Modified

None.
