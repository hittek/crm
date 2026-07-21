---
id: S03
parent: M008
milestone: M008
provides:
  - POST /api/chatbot/agentbot/[slug] endpoint
  - sendChatwootMessage / handoffConversation helpers
  - chatwootAgentBotToken on Organization for bot API auth
requires:
  []
affects:
  []
key_files:
  - pages/api/chatbot/agentbot/[slug].js
  - lib/chatwoot.js
key_decisions:
  - AgentBot responds 200 immediately then processes async — prevents Chatwoot timeout
  - sessionId uses chatwoot-{accountId}-{convId} to tie Chatwoot conversation to CRM Conversation row
  - botKey in webhook URL routes to specific chatbot; falls back to most recently created active bot
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T20:31:51.305Z
blocker_discovered: false
---

# S03: AgentBot Bridge — Replace Raw Webhooks

**AgentBot bridge live — any Chatwoot inbox message flows through Claude+RAG and replies appear in Chatwoot UI**

## What Happened

Built the complete AgentBot bridge. Chatwoot inbox message → AgentBot webhook POST → CRM resolves org+chatbot from slug+botKey → processMessage runs Claude+RAG → reply POSTed back to Chatwoot Conversations API. End-to-end verified with live test messages — greeting on first message, Claude RAG response on second.

## Verification

Two Chatwoot messages → two CRM log entries → two replies in Chatwoot conversation. Claude RAG response confirmed on second message.

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

ANTHROPIC_API_KEY and VOYAGE_API_KEY were missing from .env (previously on Vercel) — added during T04. chatwootAgentBotToken added via raw ALTER TABLE (prisma.config.js requires dotenv not in prisma-cli image).

## Known Limitations

conversation_updated events from Chatwoot fire the AgentBot webhook again — the handler correctly ignores them (only processes message_created + incoming).

## Follow-ups

A real WhatsApp/Telegram channel should be connected to Chatwoot to test with a real messaging channel (S04).

## Files Created/Modified

- `lib/chatwoot.js` — Added sendChatwootMessage, handoffConversation; provisionOrg now returns chatwootAgentBotToken
- `prisma/schema.prisma` — Added chatwootAgentBotToken String? field
- `pages/api/chatbot/agentbot/[slug].js` — AgentBot webhook handler — Chatwoot messages → Claude+RAG → Chatwoot reply
- `.env` — Added ANTHROPIC_API_KEY, VOYAGE_API_KEY
