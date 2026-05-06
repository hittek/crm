---
slice: S01
title: Unified Channel Engine + Telegram + WhatsApp + Facebook
status: complete
commit: 503a174
---

## What Was Built

**T01 — Schema + encryption**
- `ChannelConfig`: orgId, chatbotId, channel, credentials (AES-256-GCM), isActive, botUsername, phoneNumberId, pageId
- `lib/crypto.js`: `encrypt/decrypt/encryptJSON/decryptJSON` — AES-256-GCM with `ENCRYPTION_KEY` env
- `NEXT_PUBLIC_APP_URL` env for webhook URL generation

**T02 — Channel engine**
- `lib/channelEngine.js`: `processMessage({ chatbot, channel, sessionId, userMessage, metadata })`
  - Finds/creates Conversation; persists messages; escalation check; RAG+Claude (non-streaming)
  - Returns `{ reply, conversationId, escalated }`
- `buildSystemPrompt()` shared helper (same as streaming chat.js)

**T03 — Telegram**
- `lib/channels/telegram.js`: `getMe`, `setWebhook`, `deleteWebhook`, `sendMessage`
- `pages/api/webhook/telegram/[apiKey].js`: public handler routed by chatbot apiKey in URL
  - Parses Update object, calls processMessage, replies via sendMessage
  - Always returns 200 (Telegram retry prevention)

**T04 — WhatsApp**
- `pages/api/webhook/whatsapp/index.js`: GET verification + POST message handler
  - Routed by `phoneNumberId` in payload → lookup ChannelConfig
  - Sends reply via Cloud API v19

**T04 — Facebook Messenger**
- `pages/api/webhook/facebook/index.js`: GET verification + POST message handler
  - Routed by `pageId` (recipient.id) in payload → lookup ChannelConfig
  - Sends reply via Graph API v19 `/me/messages`

**T04 — Channel settings UI**
- `ChannelsModal` in chatbots.js: Telegram/WhatsApp/Facebook connect forms
  - Telegram: token → getMe verify → setWebhook → save; shows @botname + webhook URL
  - WhatsApp/Facebook: credential forms + webhook URL with copy button
- BotCard: globe icon opens modal
- Channel management API: GET/POST/DELETE `/api/chatbot/bots/[id]/channels`

## Verification
- `GET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=x` → 403 (no matching token — correct)
- `GET /api/webhook/facebook?...` → 403 (same)
- `/chatbots` → 200, channels modal accessible

## Notes
- `ENCRYPTION_KEY` in `.env` — must also be set in Vercel env vars before production deploy
- WhatsApp + Facebook require Meta app review for production; works in sandbox/test mode
- S04 (human handoff) was already shipped in M003 — marked complete in roadmap
