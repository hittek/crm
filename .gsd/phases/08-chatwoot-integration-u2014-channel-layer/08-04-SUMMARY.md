---
id: S04
parent: M008
milestone: M008
provides:
  - createChatwootInbox/deleteInbox helpers
  - chatwootAdminToken on Organization
  - chatwootInboxId on ChannelConfig
  - Chatwoot-backed Telegram inbox connect/disconnect
requires:
  []
affects:
  []
key_files:
  - pages/api/chatbot/bots/[id]/channels/index.js
  - lib/chatwoot.js
  - pages/chatbots.js
key_decisions:
  - Per-account admin tokens stored in Organization.chatwootAdminToken for inbox lifecycle
  - Chatwoot Telegram inbox creation replaces raw Telegram setWebhook — Chatwoot handles the webhook registration
  - chatwootInboxId stored on ChannelConfig for delete/update operations
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T20:42:21.271Z
blocker_discovered: false
---

# S04: OAuth Channel Connect UI

**Telegram channel connect now creates a Chatwoot inbox automatically — no manual webhook URL copy needed**

## What Happened

Migrated Telegram channel connect from manual raw webhook registration to Chatwoot-backed inbox creation. User pastes bot token → CRM creates Chatwoot Telegram inbox via API + links AgentBot → messages flow through S03 handler. Disconnect removes the Chatwoot inbox. UI updated to remove manual webhook step.

## Verification

createChatwootInbox + deleteInbox roundtrip passed; live message through Chatwoot got Claude reply.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Used per-account admin users (created via Rails) rather than platform API for inbox management. chatwootAdminToken added to Organization. No real Telegram bot token tested — verified with API channel type + live message flow.

## Known Limitations

WhatsApp and Facebook channels still use legacy raw webhook path — not yet migrated to Chatwoot inboxes.

## Follow-ups

When a user connects Telegram with a real bot token, Chatwoot will call the Telegram Bot API to register the webhook automatically — no manual step needed. WhatsApp/Facebook channels still use legacy raw webhook path; migrating them follows the same pattern but requires Meta Cloud API credentials.

## Files Created/Modified

- `lib/chatwoot.js` — Added createChatwootInbox, deleteInbox helpers; exported both
- `prisma/schema.prisma` — Added chatwootAdminToken to Organization, chatwootInboxId to ChannelConfig
- `pages/api/chatbot/bots/[id]/channels/index.js` — Telegram connect → Chatwoot inbox (not raw setWebhook); DELETE removes Chatwoot inbox
- `pages/chatbots.js` — Removed manual webhook URL button for Telegram; updated hint text
