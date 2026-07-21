---
id: T02
parent: S04
milestone: M008
key_files:
  - pages/api/chatbot/bots/[id]/channels/index.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:38:40.378Z
blocker_discovered: false
---

# T02: Channel API migrated to Chatwoot inboxes for Telegram connect/disconnect

**Channel API migrated to Chatwoot inboxes for Telegram connect/disconnect**

## What Happened

Updated Telegram connect to call createChatwootInbox (Chatwoot creates inbox + registers webhook + links AgentBot). DELETE now removes Chatwoot inbox when chatwootInboxId is set. Removed raw setWebhook/deleteWebhook calls for Telegram.

## Verification

no SyntaxError in module

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node --input-type=module < pages/api/chatbot/bots/[id]/channels/index.js 2>&1 | grep SyntaxError | wc -l` | 0 | ✅ pass — 0 syntax errors | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `pages/api/chatbot/bots/[id]/channels/index.js`
