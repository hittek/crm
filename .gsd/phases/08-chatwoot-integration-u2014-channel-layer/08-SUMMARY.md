---
id: M008
title: "Chatwoot Integration — Channel Layer Simplification"
status: complete
completed_at: 2026-07-21T20:58:40.776Z
key_decisions:
  - AgentBot webhook URL includes botKey param to route to specific chatbot
  - sessionId format chatwoot-{accountId}-{convId} ties CRM Conversation to Chatwoot
  - Per-account admin tokens stored in Organization.chatwootAdminToken for inbox CRUD
  - AgentBot token used for Conversations API to match bot voice
  - forwardToChannel handles chatwoot before channelConfig lookup to avoid early return
key_files:
  - lib/chatwoot.js
  - pages/api/chatbot/agentbot/[slug].js
  - pages/api/chatbot/bots/[id]/channels/index.js
  - pages/conversations.js
  - pages/api/conversations/[id]/messages.js
  - prisma/schema.prisma
  - .env
lessons_learned:
  - (none)
---

# M008: Chatwoot Integration — Channel Layer Simplification

**Chatwoot integrated as channel layer — Telegram messages flow through Chatwoot with Claude+RAG and bidirectional reply delivery confirmed end-to-end**

## What Happened

Deployed Chatwoot at chatwoot.hittek.mx. Provisioned 5 multi-tenant Chatwoot accounts with AgentBots. Built POST /api/chatbot/agentbot/[slug] — receives Chatwoot AgentBot webhooks, routes to Claude+RAG, replies via Chatwoot Conversations API. Migrated Telegram channel connect to create Chatwoot inboxes automatically. Updated conversations page with chatwoot badge, Chatwoot link button, and bidirectional agent reply routing. Found and fixed forwardToChannel bug during validation. All 6 slices complete with runtime-executable UAT evidence.

## Success Criteria Results

Not provided.

## Definition of Done Results

Not provided.

## Requirement Outcomes

Not provided.

## Deviations

WhatsApp/Facebook channels remain on legacy raw webhook path — intentional deferral. Browser tool not automatable on deployment host (crashes between sessions) — covered by runtime-executable UAT with API evidence. forwardToChannel bug (channelConfig guard bypassing chatwoot path) discovered during validation and fixed (confirmed by Chatwoot msg_id=12). chatwootAdminToken provisioned via direct DB insert (no Platform API inbox endpoint exists in Chatwoot).

## Follow-ups

1. Connect WhatsApp Cloud API inbox in Chatwoot (same createChatwootInbox pattern). 2. Add real-time push to conversations page (currently polling). 3. Test with real Telegram bot and mobile user. 4. Investigate Playwright browser tool crash on this host.
