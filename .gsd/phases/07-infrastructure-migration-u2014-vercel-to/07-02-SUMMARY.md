---
id: S02
parent: M007
milestone: M007
provides:
  - ["Local pgvector:pg17 postgres with full production data", "Verified login with production credentials", "neon_dump.sql for RPi4 transfer"]
requires:
  []
affects:
  []
key_files:
  - ["neon_dump.sql", "docker-compose.yaml", ".gitignore"]
key_decisions:
  - ["pgvector:pg17 over pg15 — source Prisma Accelerate is pg17", "sslmode=require instead of verify-full for pg_dump in container (no root cert)", "127.0.0.1 in healthcheck instead of localhost — alpine wget resolves localhost to IPv6"]
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-17T18:31:59.344Z
blocker_discovered: false
---

# S02: PostgreSQL Migration from Neon

**Production data migrated from Prisma Accelerate to local Docker pg17 — login works, all 20 tables populated**

## What Happened

Dumped production data via pg_dump against the Prisma Accelerate postgres:// endpoint (pg17 server, sslmode=require). Restored into fresh pgvector:pg17 Docker container. Upgraded image from pg15 to pg17 to match source. Fixed IPv6 healthcheck bug. Full stack healthy. Login confirmed with production credentials returning admin user for Homeblinds org.

## Verification

All 3 tasks complete. pg_dump exit 0, 20 tables, 1.35MB. psql restore exit 0. Row counts match. Login API returns admin session. /api/health ok."

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

Prisma Accelerate postgres:// proxy used instead of direct Neon URL (no direct Neon access). pg17 image required — source was pg17 not pg15. wget healthcheck needed 127.0.0.1 not localhost (alpine IPv6 resolution).

## Known Limitations

None.

## Follow-ups

Neon dump file (neon_dump.sql) should be transferred to RPi4 for production migration — it's gitignored and only on this dev machine.

## Files Created/Modified

- `docker-compose.yaml` — Upgraded postgres image to pgvector:pg17, fixed healthcheck to use 127.0.0.1
- `.gitignore` — Added neon_dump.sql and neon_dump_err.txt to gitignore
