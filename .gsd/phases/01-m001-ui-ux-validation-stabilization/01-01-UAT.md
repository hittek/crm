# S01: Fix seed blocker, shared login fixture, full E2E audit, Auth & Mobile tests — UAT

**Milestone:** M001
**Written:** 2026-04-29T19:52:03.608Z

# S01 UAT — E2E Foundation

## Verified Behaviors

### Seeding
- [ ] `pnpm db:seed` completes without error against a direct PostgreSQL connection (no PRISMA_ACCELERATE_URL required)

### Shared Login Fixture
- [ ] All 5 spec files import `login` from `./helpers/login` (no duplicate inline login functions)
- [ ] `login()` successfully authenticates as `admin@hittek.com` in all test contexts

### Auth & Mobile Tests (4/4 passing)
- [ ] `Auth & Mobile › logs out successfully` — user menu opens, logout redirects to /login
- [ ] `Auth & Mobile › session persists on reload` — reload stays on / with nav visible
- [ ] `Auth & Mobile › mobile sidebar opens and closes at 375px` — hamburger opens, click outside closes
- [ ] `Auth & Mobile › mobile sidebar opens and closes at 768px` — same at tablet width

### Audit Report
- [ ] `tests/e2e/audit-report.md` exists and documents per-test pass/fail for all 85 tests
- [ ] 6 root-cause bug categories documented with affected test counts
- [ ] "What's Working" section accurately reflects passing behaviors

