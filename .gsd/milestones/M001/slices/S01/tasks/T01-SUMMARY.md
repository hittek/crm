---
id: T01
parent: S01
milestone: M001
key_files:
  - prisma/seed.js
key_decisions:
  - Added postgres:// branch using PrismaPg + pg.Pool to mirror lib/prisma.js; placed before the Accelerate branch so direct connections take priority when PRISMA_DATABASE_URL is absent
duration: 
verification_result: passed
completed_at: 2026-04-28T19:51:59.799Z
blocker_discovered: false
---

# T01: Add postgres:// branch to seed.js createPrismaClient() so seeding works with direct PostgreSQL without PRISMA_DATABASE_URL

**Add postgres:// branch to seed.js createPrismaClient() so seeding works with direct PostgreSQL without PRISMA_DATABASE_URL**

## What Happened

The seed.js `createPrismaClient()` had only two paths: SQLite (`file:`) and Prisma Accelerate (`PRISMA_DATABASE_URL`). The current `.env` has a direct `postgres://` URL with no `PRISMA_DATABASE_URL`, causing the function to throw `'DATABASE_URL must be SQLite'` on any invocation.

Fix: inserted a third branch (ordered before the Accelerate check) that triggers when `DATABASE_URL` starts with `postgres://` or `postgresql://`. It mirrors `lib/prisma.js` exactly — `PrismaPg` from `@prisma/adapter-pg` wrapping a `new Pool({ connectionString: databaseUrl })`. The error message on the final fallback was also updated to reflect the three valid configurations.

The seed ran successfully after the fix: organization, 4 users, 5 contacts, 6 deals, 7 tasks, and 6 activities were created, exiting 0.

## Verification

Ran `node prisma/seed.js 2>&1 | tail -10; echo "exit: $?"`. Output showed all entities created and `✨ Seeding completed!` with exit 0. No connection errors or throws.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node prisma/seed.js 2>&1 | tail -10; echo "exit: $?"` | 0 | ✅ pass | 8500ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `prisma/seed.js`
