---
id: T01
parent: S02
milestone: M007
key_files:
  - neon_dump.sql
  - .gitignore
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-17T18:17:03.601Z
blocker_discovered: false
---

# T01: Dumped production Prisma Accelerate (pg17) database — 1.35MB, 20 tables, clean exit

**Dumped production Prisma Accelerate (pg17) database — 1.35MB, 20 tables, clean exit**

## What Happened

Discovered the stored URL was Prisma Accelerate's postgres:// wire-protocol endpoint (db.prisma.io:5432). psql connection test confirmed pg17.2 server. pg_dump from pgvector:pg15 image failed due to version mismatch. Used postgres:17-alpine image instead. Had to change sslmode from verify-full to require (no root cert in container). Dump succeeded: 1.35MB, 6280 lines, 20 tables (all schema models). Added neon_dump.sql and neon_dump_err.txt to .gitignore.

## Verification

Exit code 0. 20 CREATE TABLE statements matching all Prisma models. 1,388,935 bytes. neon_dump.sql gitignored.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -c '^CREATE TABLE' neon_dump.sql && wc -c < neon_dump.sql` | 0 | ✅ pass | 80ms |

## Deviations

Used postgres:17-alpine (not pgvector:pg15) because server is pg17. Used sslmode=require instead of verify-full due to missing root cert in container.

## Known Issues

None.

## Files Created/Modified

- `neon_dump.sql`
- `.gitignore`
