# S01: Auth, Navigation & Audit Pass

**Goal:** Fix the seed.js PostgreSQL blocker, extract a shared login() fixture for all downstream slices, run the full existing Playwright suite to produce an audit report of every broken interaction, and add the three missing test categories (logout, session persistence, mobile sidebar at 375px/768px).
**Demo:** After this: login/logout works, all nav links navigate correctly, sidebar collapses on mobile, and a complete audit report lists every broken interaction found

## Must-Haves

- `node prisma/seed.js` exits 0 with the current .env (remote PostgreSQL, no PRISMA_DATABASE_URL)
- `tests/e2e/helpers/login.js` exports `login(page)` and is imported by all five spec files
- `tests/e2e/audit-report.md` exists with a complete pass/fail table for every test case in the suite
- `pnpm test:e2e --grep "logs out|session persists|mobile sidebar"` passes (4 new tests green)

## Proof Level

- This slice proves: contract — S01 proves the test infrastructure contracts (shared login helper, working seed, suite baseline) that S02–S05 depend on, plus the auth and mobile viewport behaviors are directly verified.

## Integration Closure

Upstream surfaces consumed: none (first slice). New wiring introduced: `tests/e2e/helpers/login.js` is the shared runtime contract for all downstream test slices; `prisma/seed.js` gains direct-PostgreSQL support matching `lib/prisma.js`. What remains before the milestone is end-to-end: S02–S05 must fix the broken interactions enumerated in the audit report.

## Verification

- Playwright HTML report written to `playwright-report/` after each run; failed test screenshots captured in `test-results/`. `tests/e2e/audit-report.md` is the durable human-readable record of baseline pass/fail state. Future agents debug by reading the audit report first, then `playwright-report/` for individual failure details.

## Tasks

- [x] **T01: Fix prisma/seed.js to support PostgreSQL without PRISMA_DATABASE_URL** `est:30m`
  The seed.js createPrismaClient() function only handles SQLite (file: URL) or Prisma Accelerate (PRISMA_DATABASE_URL). The current .env has a remote PostgreSQL URL (postgres://) with no PRISMA_DATABASE_URL, so seed.js throws on any invocation. Without a working seed, no test setup can populate the DB. Fix by adding a third branch that mirrors lib/prisma.js: use @prisma/adapter-pg + pg.Pool when DATABASE_URL starts with postgres:// or postgresql:// and PRISMA_DATABASE_URL is absent.
  - Files: `prisma/seed.js`, `lib/prisma.js`
  - Verify: node prisma/seed.js 2>&1 | tail -5; echo "exit: $?"

- [x] **T02: Extract shared login() helper to tests/e2e/helpers/login.js** `est:25m`
  All five spec files (crm.spec.js, settings.spec.js, i18n.spec.js, notifications.spec.js, profile.spec.js) define an identical async login(page) function at the top. This is the slice's primary contract deliverable — downstream slices S02–S05 all import `const { login } = require('./helpers/login')`. Extract to a single shared file, import testUser credentials from test.config.js, and update all five spec files to remove their local definitions and import from helpers/login instead.
  - Files: `tests/e2e/helpers/login.js`, `tests/e2e/crm.spec.js`, `tests/e2e/settings.spec.js`, `tests/e2e/i18n.spec.js`, `tests/e2e/notifications.spec.js`, `tests/e2e/profile.spec.js`
  - Verify: node -e "const m = require('./tests/e2e/helpers/login.js'); console.log(typeof m.login === 'function' ? 'OK' : 'FAIL')" && grep -L 'async function login' tests/e2e/crm.spec.js tests/e2e/settings.spec.js tests/e2e/i18n.spec.js tests/e2e/notifications.spec.js tests/e2e/profile.spec.js | wc -l | grep -q '^5$' && echo 'all 5 files updated'

- [x] **T03: Run full Playwright suite and write audit-report.md** `est:40m`
  Run the complete existing Playwright test suite against the live app (playwright.config.js auto-starts the dev server via webServer: pnpm run dev). Capture the full stdout/stderr output. Parse pass/fail results per test. Write tests/e2e/audit-report.md with: run date, total counts (passed/failed/skipped), a table of every test case with its result, and for failed tests the error message and file:line. This is the primary audit deliverable promised by the slice roadmap — it tells S02–S05 exactly which interactions are broken.
  - Files: `tests/e2e/audit-report.md`
  - Verify: test -f tests/e2e/audit-report.md && grep -c '|' tests/e2e/audit-report.md | awk '{exit ($1 < 3) ? 1 : 0}' && echo 'audit report exists with table rows'

- [x] **T04: Add logout, session-persistence, and mobile sidebar tests to crm.spec.js** `est:45m`
  Three critical gaps in the current suite: no logout test, no session-persistence test, no mobile viewport tests. These are required to satisfy R001 (CRM flows validated) and R030 (responsive 375px/768px). Add four new tests to crm.spec.js in a new describe block 'Auth & Mobile': (1) logs out successfully — login, click user menu button at sidebar bottom, click logout button (contains logout icon text), assert redirect to /login; (2) session persists on reload — login, page.reload(), assert URL is still '/' and nav is visible; (3) mobile sidebar opens and closes at 375px — setViewportSize(375,812), login, click hamburger aria-label='Open menu', assert sidebar is visible (not translate-x-full), click the fixed overlay div or close button, assert sidebar hidden; (4) mobile sidebar at 768px — same flow with viewport 768x1024. All tests import login() from ./helpers/login.
  - Files: `tests/e2e/crm.spec.js`
  - Verify: pnpm test:e2e --grep 'logs out|session persists|mobile sidebar' 2>&1 | tail -20

## Files Likely Touched

- prisma/seed.js
- lib/prisma.js
- tests/e2e/helpers/login.js
- tests/e2e/crm.spec.js
- tests/e2e/settings.spec.js
- tests/e2e/i18n.spec.js
- tests/e2e/notifications.spec.js
- tests/e2e/profile.spec.js
- tests/e2e/audit-report.md
