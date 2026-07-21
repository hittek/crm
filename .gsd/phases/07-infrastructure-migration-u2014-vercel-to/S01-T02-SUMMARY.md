---
id: T02
parent: S01
milestone: M007
key_files:
  - Dockerfile
  - docker-entrypoint.sh
  - lib/storage.js
  - pages/api/uploads/[...path].js
  - pages/api/settings/upload-logo.js
  - pages/api/products/[id]/upload-image.js
  - pages/api/chatbot/knowledge-bases/[id]/documents/index.js
  - next.config.js
  - package.json
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-16T21:10:40.231Z
blocker_discovered: false
---

# T02: Wrote Dockerfile (multi-stage, linux/arm64)

**Wrote Dockerfile (multi-stage, linux/arm64)**

## What Happened

Multi-stage Dockerfile: deps (pnpm@9 install) → builder (prisma generate + next build standalone) → runner (231MB, standalone output + prisma CLI via npm flat install). Replaced @vercel/blob with lib/storage.js abstraction. Removed waitUntil. Added output: standalone to next.config.js. Added .dockerignore to keep builder cache stable across ops file changes.

## Verification

docker build --platform linux/arm64 -t hittek-crm:latest . → BUILD_SUCCESS. Image size: 231MB.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `docker build --platform linux/arm64 -t hittek-crm:latest .` | 0 | ✅ pass | 635000ms |

## Deviations

Used node:22-alpine (not 20) because pnpm@latest requires Node 22. Pinned pnpm@9 to avoid pnpm 11's build script approval requirement. Used prisma db push instead of migrate deploy (SQLite migrations in repo are incompatible with PostgreSQL). npm install prisma@7.8.0 in runner for flat install avoiding pnpm symlink resolution issues.

## Known Issues

None.

## Files Created/Modified

- `Dockerfile`
- `docker-entrypoint.sh`
- `lib/storage.js`
- `pages/api/uploads/[...path].js`
- `pages/api/settings/upload-logo.js`
- `pages/api/products/[id]/upload-image.js`
- `pages/api/chatbot/knowledge-bases/[id]/documents/index.js`
- `next.config.js`
- `package.json`
