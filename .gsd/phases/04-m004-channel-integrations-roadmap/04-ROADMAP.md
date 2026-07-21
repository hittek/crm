# M004: M004: Channel Integrations — Roadmap

**Vision:** 

## Slices

- [x] **S01: Unified Webhook Router & Telegram** `risk:high` `depends:[]`
  > After this: a single webhook endpoint routes messages from any channel to the conversation engine; Telegram bot integration is live in test mode — send a message, get a RAG answer back

- [x] **S02: WhatsApp Business (Cloud API)** `risk:high` `depends:[S01]`
  > After this: Shipped in S01 — WhatsApp webhook handler, verification, credential storage, and send via Cloud API v19.

- [x] **S03: Facebook Messenger** `risk:high` `depends:[S01]`
  > After this: Shipped in S01 — Messenger webhook handler, verification, credential storage, and send via Graph API v19.

- [x] **S04: Human Agent Handoff** `risk:medium` `depends:[S01]`
  > After this: Shipped in M003: escalation trigger, `escalated` status, agent reply UI, ConversationEvent audit log, access control. Nothing left to build.
