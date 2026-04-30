---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Fix prisma/seed.js to support PostgreSQL without PRISMA_DATABASE_URL

The seed.js createPrismaClient() function only handles SQLite (file: URL) or Prisma Accelerate (PRISMA_DATABASE_URL). The current .env has a remote PostgreSQL URL (postgres://) with no PRISMA_DATABASE_URL, so seed.js throws on any invocation. Without a working seed, no test setup can populate the DB. Fix by adding a third branch that mirrors lib/prisma.js: use @prisma/adapter-pg + pg.Pool when DATABASE_URL starts with postgres:// or postgresql:// and PRISMA_DATABASE_URL is absent.

## Inputs

- ``prisma/seed.js` — current file with the two-branch createPrismaClient() that throws on postgres:// without PRISMA_DATABASE_URL`
- ``lib/prisma.js` — reference implementation using @prisma/adapter-pg + pg.Pool({ connectionString: DATABASE_URL })`

## Expected Output

- ``prisma/seed.js` — updated with a third branch: if DATABASE_URL starts with postgres:// or postgresql:// and PRISMA_DATABASE_URL is not set, create PrismaClient using @prisma/adapter-pg + new Pool({ connectionString: DATABASE_URL })`

## Verification

node prisma/seed.js 2>&1 | tail -5; echo "exit: $?"

## Observability Impact

seed.js now logs '🌱 Seeding database...' and completion message on success; on DB connection failure it throws a pg connection error rather than the misleading 'DATABASE_URL must be SQLite' message
