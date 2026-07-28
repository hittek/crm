# Hittek CRM

A self-hosted, multi-tenant CRM platform built with Next.js, PostgreSQL, and Chatwoot. Designed for small teams managing contacts, deals, tasks, and AI-powered chatbots.

## Features

- **Contacts & CRM** — contacts, deals pipeline (Kanban), tasks, activity timeline, quotes
- **AI Chatbot** — configurable chatbots backed by knowledge bases (RAG via pgvector + Voyage AI), deployable on WhatsApp, Telegram, Facebook, and embedded web widget
- **Conversations** — unified inbox synced with Chatwoot; auto-creates contacts and deals on first message
- **Scheduled Reports** — AI-powered report builder (Claude), scheduled delivery via email + push notifications, live dashboard
- **Multi-tenancy** — organization-scoped data isolation throughout; role-based access
- **Billing** — Stripe subscription management (Starter / Pro tiers)
- **i18n** — Spanish and English

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (Pages Router) |
| Database | PostgreSQL 17 + pgvector 0.8.5 |
| ORM | Prisma |
| AI | Anthropic Claude (chatbot + report builder), Voyage AI (embeddings) |
| Conversations | Chatwoot (self-hosted) |
| Email | Resend |
| Push | Web Push (VAPID) |
| Channels | WhatsApp Cloud API, Telegram, Facebook Messenger |
| Billing | Stripe |
| Tunnel | ngrok (static domain) |
| Runtime | Node.js 20, Docker Compose |

## Prerequisites

- Docker and Docker Compose
- ngrok account with a static domain
- Anthropic API key
- Voyage AI API key (free tier — 50M tokens/month)
- Resend API key
- Meta App (for WhatsApp / Facebook channels)
- Telegram Bot (for Telegram channel + system alerts)
- Stripe account (for billing features)

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd hittek-chatbot
cp .env.example .env
# Fill in all required values in .env
```

### 2. Start the stack

```bash
docker compose up -d
```

This starts: PostgreSQL (pgvector), Redis, CRM app, Chatwoot (web + Sidekiq), and two ngrok tunnels.

### 3. Run migrations and seed

```bash
docker exec hittek-crm-app npx prisma migrate deploy
docker exec hittek-crm-app node prisma/seed.js
```

### 4. Access

- **CRM**: `https://<NGROK_DOMAIN>`
- **Chatwoot**: `https://<NGROK_DOMAIN_CHATWOOT>`
- **ngrok inspector**: `http://localhost:4043`

## Environment Variables

See [`.env.example`](.env.example) for all variables with descriptions. Key ones:

| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL password (used by all services) |
| `SESSION_SECRET` | Cookie signing key (≥32 chars) |
| `ENCRYPTION_KEY` | Channel credential encryption (64-char hex) |
| `ANTHROPIC_API_KEY` | Claude API for chatbot + report builder |
| `VOYAGE_API_KEY` | Voyage AI embeddings for knowledge base RAG |
| `RESEND_API_KEY` | Email delivery for scheduled reports |
| `TELEGRAM_BOT_TOKEN` | Telegram bot for channel integration + system alerts |
| `TELEGRAM_CHAT_ID` | Telegram chat for system alerts |
| `META_APP_ID` / `META_APP_SECRET` | WhatsApp Embedded Signup + Facebook channel |
| `INTERNAL_API_SECRET` | Guards `/api/internal/*` endpoints |

## Backups

Daily automated backups of both databases (`crm_db` and `chatwoot_production`) run at **02:30 AM** via a systemd timer.

```
/srv/media/backups/hittek-crm/
  crm_db_YYYY-MM-DD_HHMMSS.dump.gz          ← 14-day retention
  chatwoot_production_YYYY-MM-DD_HHMMSS.dump.gz
```

Manual trigger: `sudo systemctl start hittek-crm-backup.service`

Backup failures send a Telegram alert automatically.

**Restore example:**
```bash
zcat /srv/media/backups/hittek-crm/crm_db_<date>.dump.gz | \
  docker exec -i hittek-crm-postgres pg_restore -U crm -d crm_db --clean
```

## Development

```bash
pnpm install
pnpm dev        # Next.js dev server on :3000
pnpm test       # Vitest unit tests
pnpm test:e2e   # Playwright end-to-end tests
```

## Project structure

```
pages/           Next.js pages + API routes
components/      React components (contacts, deals, chatbot, reports, ui)
lib/             Business logic (rag, embeddings, scheduler, reports, channels)
prisma/          Schema + migrations
scripts/         Operational scripts (backup-db.sh, reindex-embeddings.cjs)
docker/          Postgres init SQL (pgvector extension)
tests/           Unit and API tests
```

## AI Agents

See [`AGENTS.md`](AGENTS.md) for agent and AI coding assistant guidance.
