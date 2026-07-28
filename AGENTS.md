# AGENTS.md — Hittek CRM

Guidance for AI coding agents (Claude, Codex, Cursor, etc.) working on this codebase.

## Project overview

Self-hosted multi-tenant CRM — Next.js 14 (Pages Router), PostgreSQL + pgvector, Prisma ORM, Chatwoot for conversations, Docker Compose for the full stack. See [`README.md`](README.md) for the full stack description.

## Running the app locally

```bash
docker compose up -d          # start all services
docker compose logs -f app    # tail CRM logs
curl http://localhost:3000/api/health  # should return {"status":"ok","db":"ok"}
```

Default seeded login: `admin@hittek.mx` / `password123`

## Key architectural patterns

### Multi-tenancy
Every DB model has `organizationId`. Every API route reads `session.user.organizationId` and scopes all queries to it. **Never** query without this scope.

### Auth
Session via `iron-session` cookie. All API routes call `requireAuth(req, res)` from `lib/auth.js` before doing anything.

### Chatbot RAG pipeline
```
Document upload → chunk → lib/embeddings.js (Voyage AI) → KnowledgeBaseChunk.embedding (pgvector)
User query       → embedTexts([query]) → SQL cosine search → top-k chunks → Claude prompt
```
Embeddings are 1024-dim (`voyage-4-lite`). The pgvector extension is already installed.

### Reports
`lib/reports/registry.js` maps report type slugs to handler classes extending `lib/reports/base.js`. Adding a new report type only requires a new class in `lib/reports/` and registration — no orchestration changes.

### Scheduler
`lib/scheduler.js` uses a cron that ticks via `POST /api/internal/scheduler-tick`. A `windowKey` (orgId+reportId+date) with a UNIQUE constraint prevents double-delivery on restarts.

### Channel deliverers
`lib/deliverers/email.js` (Resend), `lib/deliverers/push.js` (VAPID web push), `lib/deliverers/in-app.js` (DB notification). Called from the scheduler after a successful report run.

## Environment variables

All secrets live in `.env` (gitignored). See `.env.example` for the full list with descriptions.

Critical vars agents may need to know about:

| Variable | Used by |
|---|---|
| `DATABASE_URL` | Prisma (set automatically by docker-compose) |
| `ANTHROPIC_API_KEY` | Chatbot NLP, report builder |
| `VOYAGE_API_KEY` | Knowledge base embeddings |
| `ENCRYPTION_KEY` | Channel credential encryption at rest |
| `INTERNAL_API_SECRET` | Guards `/api/internal/*` (scheduler, migrations) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Telegram channel + system alerts |
| `META_APP_ID` / `META_APP_SECRET` | WhatsApp Embedded Signup, Facebook channel |

## Database

```bash
# Run migrations
docker exec hittek-crm-app npx prisma migrate deploy

# Open Prisma Studio
docker exec -it hittek-crm-app npx prisma studio

# Direct psql access
docker exec -it hittek-crm-postgres psql -U crm -d crm_db
```

Migrations live in `prisma/migrations/`. Always create a new migration file; never edit applied ones.

## Testing

```bash
pnpm test           # Vitest unit + API tests
pnpm test:e2e       # Playwright tests
```

API tests mock Prisma via `tests/helpers/prisma-mock.js`. Don't hit the real DB from unit tests.

## Backups

Daily automated backups at 02:30 AM via systemd timer (`hittek-crm-backup.timer`).
Script: `scripts/backup-db.sh` — dumps `crm_db` and `chatwoot_production`, retains 14 days in `/srv/media/backups/hittek-crm/`.
Failures alert via Telegram (`scripts/backup-notify-failure.sh`).

## Decisions log

See [`.gsd/DECISIONS.md`](.gsd/DECISIONS.md) for recorded architectural decisions.

Notable:
- **D001**: Voyage AI free tier retained for embeddings (Ollama migration deferred — server RAM constrained).
- **D002**: Same as above — see D001.

## Known constraints

- Server is an i5-7500T with 7.6 GB RAM; swap is near-full. Avoid adding Docker services that keep large models resident in memory.
- Chatwoot shares the same PostgreSQL instance (`chatwoot_production` database, same container).
- ngrok static domains are used for WhatsApp/Facebook webhooks — the domain must stay stable.
- `NEON_DATABASE_URL` in `.env` is a leftover from an earlier deployment and is unused; safe to ignore.
