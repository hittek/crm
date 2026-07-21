---
id: T05
parent: S01
milestone: M007
key_files:
  - Dockerfile
  - docker-compose.yaml
  - docker-entrypoint.sh
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-16T21:11:37.915Z
blocker_discovered: false
---

# T05: Full stack smoke test: Next.js + pgvector PostgreSQL + /api/health → 200 OK

**Full stack smoke test: Next.js + pgvector PostgreSQL + /api/health → 200 OK**

## What Happened

Started pgvector postgres + redis + app containers on shared network. prisma db push applied schema (vector extension present). Next.js booted in 838ms. /api/health returned {status:ok,db:ok}. Stopped and cleaned up smoke test containers.

## Verification

curl http://localhost:3000/api/health → {status:ok,db:ok,timestamp:...}. Docker image: 231MB.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -s http://localhost:3000/api/health` | 0 | ✅ pass — {status:ok, db:ok} | 120ms |

## Deviations

Used prisma db push instead of migrate deploy (existing migrations are SQLite-format, incompatible with PostgreSQL). Postgres image is pgvector/pgvector:pg15 not postgres:15-alpine. Manual docker run commands used instead of docker compose up (compose hangs on slow network download).

## Known Issues

None.

## Files Created/Modified

- `Dockerfile`
- `docker-compose.yaml`
- `docker-entrypoint.sh`
