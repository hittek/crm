---
id: S01
parent: M007
milestone: M007
provides:
  - ["hittek-crm:latest Docker image (231MB, ARM64)", "docker-compose.yaml with full stack (postgres+redis+app+ngrok)", "lib/storage.js abstraction for file uploads", "pages/api/health.js health check endpoint"]
requires:
  []
affects:
  []
key_files:
  - (none)
key_decisions:
  - ["node:22-alpine over node:20 — pnpm@9 requires Node 22", "pnpm@9 over latest — pnpm 11 requires explicit build script approval not suitable for Docker", "prisma db push over migrate deploy — SQLite migration history incompatible with PostgreSQL", "npm install prisma in runner over copying pnpm symlinks — pnpm symlinks don't resolve across COPY", "pgvector/pgvector:pg15 over postgres:15-alpine — schema uses vector(1536) for embeddings", "lib/storage.js abstraction — @vercel/blob still works when BLOB_READ_WRITE_TOKEN is set (Vercel compat)"]
patterns_established:
  - ["node:22-alpine + pnpm@9 is the working combination for this project on ARM64", "prisma db push (not migrate deploy) for fresh PostgreSQL deployments — old migrations are SQLite", "pgvector/pgvector:pg15 as base postgres image (schema requires vector extension)", "lib/storage.js pattern: abstracts blob storage, uses local filesystem when BLOB_READ_WRITE_TOKEN is unset", "npm install in runner stage (not COPY from pnpm) to avoid symlink resolution issues"]
observability_surfaces:
  - ["GET /api/health — {status,db,timestamp} — Docker health check target", "ngrok inspection UI at localhost:4043", "Container logs to stdout/stderr"]
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-16T21:13:10.608Z
blocker_discovered: false
---

# S01: Dockerize the Next.js App

**Next.js app Dockerized for ARM64 RPi4: 231MB image, pgvector PostgreSQL, /api/health → ok, Vercel deps removed**

## What Happened

Built a production-grade multi-stage Dockerfile for the RPi4 (linux/arm64). Resolved pnpm@11/Node 20 incompatibility by upgrading to Node 22. Resolved pnpm 11 build script approval friction by pinning pnpm@9. Replaced Vercel-specific code (@vercel/blob → lib/storage.js, @vercel/functions/waitUntil → plain Promise). Added pgvector postgres image for vector embedding support. Wrote docker-compose.yml with ngrok on port 4043 following the established RPi4 pattern. Added .dockerignore to keep builder cache stable. Smoke tested: 231MB image, prisma db push applied schema in 4.6s, Next.js booted in 838ms, /api/health returned {status:ok,db:ok}.

## Verification

docker build → BUILD_SUCCESS (231MB). docker run + curl /api/health → {status:ok,db:ok}. All 5 tasks complete.

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

postgres:15-alpine → pgvector/pgvector:pg15 (vector extension required by schema). node:20-alpine → node:22-alpine (pnpm@9 requires Node 22). prisma migrate deploy → prisma db push (existing migrations are SQLite-format, incompatible with PostgreSQL). npm install prisma in runner (pnpm symlinks can't be resolved by COPY alone). .dockerignore added mid-slice to fix cache invalidation.

## Known Limitations

Old SQLite-format migration files still in prisma/migrations — must be cleared before S02 generates fresh PostgreSQL migrations.

## Follow-ups

S02 (PostgreSQL migration from Neon): existing prisma/migrations are SQLite-format and cannot be replayed on PostgreSQL. For S02, delete the old migrations dir and generate fresh PostgreSQL-native migrations from the current schema before migrating data.

## Files Created/Modified

- `Dockerfile` — Multi-stage ARM64 build: node:22-alpine, pnpm@9, standalone output, npm prisma in runner
- `docker-compose.yaml` — Full stack: pgvector/pg15 + redis:7 + app + ngrok on port 4043
- `docker-entrypoint.sh` — prisma db push on startup, then node server.js
- `.dockerignore` — Excludes ops/test files to keep builder COPY cache stable
- `docker/postgres-init/01-extensions.sql` — CREATE EXTENSION IF NOT EXISTS vector
- `lib/storage.js` — @vercel/blob abstraction — local filesystem when BLOB_READ_WRITE_TOKEN unset
- `pages/api/uploads/[...path].js` — Serves files from /data/uploads volume
- `pages/api/health.js` — GET /api/health — {status,db,timestamp}
- `pages/api/settings/upload-logo.js` — Migrated from @vercel/blob to lib/storage
- `pages/api/products/[id]/upload-image.js` — Migrated from @vercel/blob to lib/storage
- `pages/api/chatbot/knowledge-bases/[id]/documents/index.js` — Removed @vercel/functions waitUntil, replaced with plain .catch()
- `next.config.js` — Added output: standalone
- `package.json` — pnpm.onlyBuiltDependencies for ARM64 native deps
- `.env.example` — Complete self-hosted env var reference
