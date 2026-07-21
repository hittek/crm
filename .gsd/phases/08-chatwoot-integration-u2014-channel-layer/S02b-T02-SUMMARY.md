---
id: T02
parent: S02b
milestone: M008
key_files:
  - pages/api/chatbot/bots/index.js
  - pages/api/chatbot/bots/[id].js
  - lib/chatwoot.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:06:00.581Z
blocker_discovered: false
---

# T02: Chatbot lifecycle fully synced to Chatwoot AgentBot — create/update/delete all hooked

**Chatbot lifecycle fully synced to Chatwoot AgentBot — create/update/delete all hooked**

## What Happened

Wired chatbot POST (webhook URL set to /agentbot/{slug}?botKey={apiKey}), PATCH (name sync), DELETE (webhook reset to org default). All non-blocking with error logging.

## Verification

grep -c updateAgentBot bots/index.js → 3 matches

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -c 'updateAgentBot|chatwoot' pages/api/chatbot/bots/index.js` | 0 | ✅ pass — 3 matches | 50ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `pages/api/chatbot/bots/index.js`
- `pages/api/chatbot/bots/[id].js`
- `lib/chatwoot.js`
