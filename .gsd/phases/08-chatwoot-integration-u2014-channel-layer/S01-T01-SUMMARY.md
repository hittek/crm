---
id: T01
parent: S01
milestone: M008
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: untested
completed_at: 2026-07-21T18:40:29.085Z
blocker_discovered: false
---

# T01: Researched Chatwoot Docker setup: base+rails+sidekiq pattern, postgres DB, redis, required env vars

**Researched Chatwoot Docker setup: base+rails+sidekiq pattern, postgres DB, redis, required env vars**

## What Happened

Official production compose uses a base YAML anchor, rails service (entrypoint rails.sh), and sidekiq service. Chatwoot needs its own DB (chatwoot_production) — can share our existing postgres container by just creating the DB. Redis is shared; Chatwoot accepts REDIS_URL with password. Required env: SECRET_KEY_BASE, FRONTEND_URL, POSTGRES_DATABASE/USERNAME/PASSWORD/HOST, REDIS_URL. DB setup via `bundle exec rails db:chatwoot_prepare` inside the rails container. Image is linux/amd64 compatible. No ActionCable separate service needed — it's embedded in the rails process.

## Verification

Research complete — pattern confirmed from official docker-compose.production.yaml

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| — | No verification commands discovered | — | — | — |

## Deviations

None.

## Known Issues

Our redis has no password; Chatwoot's REDIS_URL can be passwordless (redis://redis:6379) — no change needed.

## Files Created/Modified

None.
