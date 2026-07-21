---
id: T02
parent: S02
milestone: M007
key_files:
  - docker-compose.yaml
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-17T18:31:32.721Z
blocker_discovered: false
---

# T02: Restored Neon dump into pgvector:pg17 Docker container — all 20 tables loaded, app healthy

**Restored Neon dump into pgvector:pg17 Docker container — all 20 tables loaded, app healthy**

## What Happened

Upgraded docker-compose.yaml from pgvector:pg15 to pgvector:pg17 to match source server version. Removed old pg15 data volume (incompatible with pg17 binary format). Started fresh container, restored neon_dump.sql via docker exec psql. Exit code 0, all ALTER TABLE confirmations. Fixed IPv6 wget healthcheck bug (localhost → 127.0.0.1). Full stack came up healthy.

## Verification

psql row counts: Contact=44, Deal=19, Task=31, Conversation=48, Product=464, User=8, KnowledgeBaseChunk=18. docker health: healthy. /api/health: {status:ok,db:ok}.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker inspect --format='{{.State.Health.Status}}' hittek-crm-app` | 0 | ✅ pass | 200ms |
| 2 | `curl -s http://localhost:3000/api/health` | 0 | ✅ pass — {status:ok,db:ok} | 80ms |

## Deviations

Upgraded postgres image to pgvector:pg17 (source is pg17, pg15 was incompatible). Dropped old pg15 data volume before restore. Fixed healthcheck: localhost → 127.0.0.1 to avoid wget IPv6 resolution issue on alpine.

## Known Issues

None.

## Files Created/Modified

- `docker-compose.yaml`
