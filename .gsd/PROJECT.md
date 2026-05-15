# Hittek CRM

## What This Is

A white-label CRM SaaS that Hittek sells to small businesses in Mexico. Each client gets a full CRM (contacts, deals, tasks, pipeline, reports) under their own branding at `[client].hittek.mx`, with optional custom domain mapping. Clients can deploy AI-powered chatbots to Facebook Messenger, WhatsApp Business, and Telegram — backed by custom knowledge bases. Chatbot conversations, leads, and quotes flow back into the CRM automatically.

## Core Value

A small business in Mexico can manage their customer relationships and run AI chatbots on their existing messaging channels — all under their own brand — without hiring a developer.

## Current State

The core CRM is built and functional: contacts, deals, tasks, pipeline (kanban), activities, notifications, audit logs, multi-tenancy (Organization model), role-based auth (admin/manager/user), i18n (es/en). Some UI interactions are broken (buttons not wired correctly). No SaaS layer, no billing, no chatbot. Runs locally on Next.js 14 + Prisma + PostgreSQL.

## Architecture / Key Patterns

- **Framework**: Next.js 14 (pages router), React 18
- **Database**: PostgreSQL via Prisma ORM — multi-tenant via `organizationId` on all models
- **Auth**: iron-session with HTTP-only cookies, bcrypt password hashing, RBAC (admin/manager/user)
- **Styling**: Tailwind CSS, camelCase component naming
- **i18n**: Custom i18n layer, translations in `lib/i18n/translations/` (es/en)
- **Tests**: Jest (API), Playwright (e2e) — e2e tests currently test visibility only, not interactions
- **Target infra**: AWS (topology TBD — cost analysis in M002), domain `hittek.mx` on GoDaddy
- **AI**: Anthropic Claude API + pgvector on existing PostgreSQL for RAG
- **Payments**: Stripe primary (subscriptions), Conekta evaluated for OXXO/SPEI needs

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: UI/UX Validation & Stabilization — 96/96 tests passing, all CRM interactions verified (2026-04-30)
- [ ] M002: SaaS Foundation — Self-signup, tiered billing, white-label, super-admin, subdomain routing
- [ ] M003: Chatbot Platform Core — Knowledge bases, RAG engine, chatbot config, conversation management
- [ ] M004: Channel Integrations — Facebook Messenger, WhatsApp Business, Telegram live
- [ ] M005: Quote Generation — CRM quote builder (PDF), chatbot quote generation
- [ ] M006: CRM ↔ Chatbot Bridge — Activity logging, lead auto-creation, human handoff
- [ ] M007: Email Campaigns *(future — not yet planned)*
- [ ] M008: Native Calendar Integration *(future — not yet planned)*
