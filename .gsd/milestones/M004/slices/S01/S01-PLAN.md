# S01 Plan: Unified Channel Engine + Telegram

## Goal
Extract non-streaming chat logic into a shared engine. Connect Telegram bots to chatbots.
After this slice: org admin enters a Telegram bot token, connects it, and end-users messaging
the bot get RAG answers. Conversations visible in CRM.

## Tasks

- [ ] **T01: Schema + encryption utility** `est:30m`
  - `ChannelConfig` model: orgId, chatbotId, channel, credentials (encrypted JSON),
    isActive, phoneNumberId (WA lookup), pageId (FB lookup)
  - `@@unique([chatbotId, channel])` — one config per chatbot per channel
  - `lib/crypto.js`: `encrypt(text)` / `decrypt(text)` — AES-256-GCM, key from ENCRYPTION_KEY env
  - `prisma db push` + `prisma generate`

- [ ] **T02: Channel engine library** `est:1h`
  - `lib/channelEngine.js`: `processMessage({ chatbot, channel, sessionId, userMessage, metadata })`
    - Finds/creates `Conversation` (by chatbotId + sessionId + channel)
    - Persists user message
    - Escalation phrase check → escalate + notify if matched
    - RAG retrieval via `searchChunks`
    - Claude completion (non-streaming, same model + system prompt as chat.js)
    - Persists assistant message
    - Returns `{ reply, conversationId, escalated }`
  - Extract `buildSystemPrompt(chatbot, contextText)` shared helper

- [ ] **T03: Telegram webhook handler** `est:45m`
  - `lib/channels/telegram.js`:
    - `sendMessage(botToken, chatId, text)` — POST to Telegram Bot API
    - `getMe(botToken)` — verify token, returns bot info
    - `setWebhook(botToken, url)` — registers webhook URL
  - `pages/api/webhook/telegram/[apiKey].js` — public, no auth
    - Looks up chatbot by apiKey; loads ChannelConfig for `telegram`
    - Extracts chatId + text from Telegram Update object
    - Calls `processMessage()`; calls `sendMessage()` with reply
    - Returns 200 immediately (Telegram requires fast ack)
  - Webhook URL pattern: `https://{domain}/api/webhook/telegram/{chatbot.apiKey}`

- [ ] **T04: Channel settings UI** `est:1.5h`
  - New page `/chatbot/channels` (or section on chatbot detail) — per chatbot
  - Actually: "Canales" tab in the chatbot edit modal OR dedicated route `/chatbots/[id]/channels`
  - Decision: dedicated page at `/chatbots/[id]` with tabs (Config | Canales)
  - Telegram card:
    - Input for bot token
    - "Conectar" → POST `/api/chatbot/[id]/channels` `{ channel: 'telegram', token }`
      - API: getMe() to verify, setWebhook(), encrypt + save ChannelConfig
    - Connected state: shows @botname + webhook URL (copy button)
    - "Desconectar" → DELETE
  - WhatsApp + Facebook cards: "Próximamente" placeholders (built in S02/S03)
  - API routes: GET/POST/DELETE `/api/chatbot/[id]/channels`
