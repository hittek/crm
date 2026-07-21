---
id: T03
parent: S01
milestone: M007
key_files:
  - docker-compose.yaml
  - .env.example
  - docker/postgres-init/01-extensions.sql
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-16T21:11:00.736Z
blocker_discovered: false
---

# T03: Wrote docker-compose.yml (app + postgres + redis + ngrok)

**Wrote docker-compose.yml (app + postgres + redis + ngrok)**

## What Happened

docker-compose.yaml: app + pgvector/pgvector:pg15 + redis:7-alpine + ngrok (static domain, port 4043). All services on crm-network bridge. Health checks on postgres and redis. App depends on healthy postgres + redis. .env.example completed with all required vars.

## Verification

POSTGRES_PASSWORD=test NGROK_AUTHTOKEN=test NGROK_DOMAIN=test.ngrok.app docker compose config — exits 0.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker compose config --quiet` | 0 | ✅ pass | 1000ms |

## Deviations

postgres image changed from postgres:15-alpine to pgvector/pgvector:pg15 (schema uses vector type). Added docker/postgres-init/01-extensions.sql for CREATE EXTENSION vector. Port 4043 for ngrok inspection (4042=YAMS, 4040=homeblinds pattern).

## Known Issues

None.

## Files Created/Modified

- `docker-compose.yaml`
- `.env.example`
- `docker/postgres-init/01-extensions.sql`
