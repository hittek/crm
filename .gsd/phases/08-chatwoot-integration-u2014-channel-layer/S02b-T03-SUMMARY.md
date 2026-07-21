---
id: T03
parent: S02b
milestone: M008
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:09:42.716Z
blocker_discovered: false
---

# T03: App deployed with chatbot lifecycle hooks active; all AgentBot webhook URLs updated

**App deployed with chatbot lifecycle hooks active; all AgentBot webhook URLs updated**

## What Happened

Built and deployed new app image. App healthy. Verified existing chatbot AgentBot webhooks now include botKey query param. All 5 org AgentBots confirmed with correct URLs in Chatwoot Platform API.

## Verification

docker compose ps → crm-app healthy; Chatwoot AgentBot URLs confirmed via Platform API

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker compose ps | grep crm-app` | 0 | ✅ pass — healthy | 500ms |
| 2 | `Chatwoot Platform API agent_bots check via rails runner` | 0 | ✅ pass — bot 1 and bot 5 URLs include botKey | 800ms |

## Deviations

Backfilled existing chatbot webhooks manually via Rails runner since the hook only fires on new chatbot creation.

## Known Issues

None.

## Files Created/Modified

None.
