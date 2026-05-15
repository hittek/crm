# S03: Chatbot Config UI & Conversation Persistence

## Goal
Org admins can create and configure named chatbots (linked to a KB, with greeting and escalation settings).
The internal sandbox saves every conversation. Channel integrations (WhatsApp/Facebook/Telegram) in M004 reference these chatbot configs.

No public/embeddable widget — external channel traffic comes through platform webhooks with platform-provided auth.

## Tasks

- [x] **T01: Schema** `est:30m`
  - `Chatbot`: id, orgId, kbId, name, greeting, escalationPhrase, avatarUrl, primaryColor, apiKey, isActive
  - `Conversation`: id, chatbotId, orgId, sessionId, channel, status, contactId, metadata
  - `ConversationMessage`: id, conversationId, role, content
  - `prisma db push` ✓

- [ ] **T02: Chatbot management page** `est:1.5h`
  - New page `/chatbots` — list all chatbots for the org
  - Create form: name, select KB, greeting, escalation phrase, primary color
  - Edit + delete
  - Sidebar nav entry (between KB and settings)

- [ ] **T03: Wire sandbox to Chatbot config + conversation persistence** `est:1h`
  - `ChatPanel` now takes a `chatbot` prop (not just `kb`)
  - On first message: create `Conversation` row (`channel: 'sandbox'`)
  - Each message pair: create `ConversationMessage` rows (user + assistant)
  - Update `/api/chatbot/[kbId]/chat` to accept optional `chatbotId` + `sessionId`
  - Use chatbot greeting, escalation phrase, and name in system prompt when provided

- [ ] **T04: Conversation list (basic)** `est:1h`
  - New page `/conversations` — list conversations with channel badge, status, date, chatbot name
  - Click to expand full message history inline
  - Sidebar nav entry
