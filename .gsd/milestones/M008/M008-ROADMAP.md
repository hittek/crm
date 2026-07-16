# M008: Chatwoot Integration \u2014 Channel Layer Simplification

**Vision:** Replace the hand-rolled Meta webhook handlers with Chatwoot as the channel abstraction layer. Chatwoot runs on the same RPi4 Docker stack, sharing the existing PostgreSQL server (separate database) and Redis. Customers connect WhatsApp and Facebook with one OAuth click. Conversations live in Chatwoot; the CRM keeps a thin reference. The CRM /conversations page proxies message threads from Chatwoot API; Chatwoot\u2019s native inbox is linked in the sidebar for agents who want its full UI.

## Success Criteria

- Customer connects WhatsApp via one OAuth click — no tokens pasted
- All channels reach Claude+RAG via Chatwoot AgentBot
- CRM /conversations shows real threads from Chatwoot API
- Raw webhook handlers for WhatsApp, Facebook, Telegram deleted
- Chatwoot inbox accessible from CRM sidebar
- New org signup auto-provisions a Chatwoot account

## Slices

- [ ] **S01: Deploy Chatwoot on Shared Docker Stack** `risk:medium` `depends:[]`
  > After this: curl chatwoot.localhost/auth/sign_in returns 200. Chatwoot super admin console accessible.

- [ ] **S02: Multi-tenant Org Provisioning via Platform API** `risk:high` `depends:[S01]`
  > After this: Create org in CRM → Chatwoot account + AgentBot auto-provisioned via Platform API.

- [ ] **S03: AgentBot Bridge — Replace Raw Webhooks** `risk:high` `depends:[S02]`
  > After this: Send WhatsApp message → Claude+RAG responds — via Chatwoot AgentBot, zero raw Meta webhook code remaining

- [ ] **S04: OAuth Channel Connect UI** `risk:medium` `depends:[S02]`
  > After this: Connect WhatsApp Business via one OAuth click. Channel active in under 60 seconds. No tokens pasted.

- [ ] **S05: Conversations Page — Chatwoot-backed Messages** `risk:medium` `depends:[S03]`
  > After this: Open /conversations → click conversation → full message thread from Chatwoot. Agent reply delivered via WhatsApp. Chatwoot inbox link in sidebar.

## Boundary Map

Not provided.
