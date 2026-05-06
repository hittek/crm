# M004: Channel Integrations — Roadmap

## Slices

- [ ] **S01: Unified Webhook Router & Telegram** `risk:high` `depends:[]`
  > After this: a single webhook endpoint routes messages from any channel to the conversation engine; Telegram bot integration is live in test mode — send a message, get a RAG answer back

- [ ] **S02: WhatsApp Business (Cloud API)** `risk:high` `depends:[S01]`
  > After this: WhatsApp webhook verification passes; test messages route through the RAG engine and reply on WhatsApp; phone number + token stored encrypted per org

- [ ] **S03: Facebook Messenger** `risk:high` `depends:[S01]`
  > After this: Messenger webhook verification passes; test messages route through the RAG engine and reply on Messenger; page token stored encrypted per org

- [x] **S04: Human Agent Handoff** `risk:medium` `depends:[S01]`
  > Shipped in M003: escalation trigger, `escalated` status, agent reply UI, ConversationEvent audit log, access control. Nothing left to build.
