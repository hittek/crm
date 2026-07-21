# S01: Auth, Navigation & Audit Pass — Research

**Date:** 2026-04-28
**Requirements:** R001 (primary), R030 (mobile — cross-cutting)

---

## Summary

S01 is well-understood, targeted work. The auth system (iron-session) is fully implemented and appears correct — login, logout, and session-check APIs all exist and look solid. The Layout sidebar has a working mobile hamburger mechanism. The existing Playwright suite in `tests/e2e/crm.spec.js` covers login, navigation, and component visibility but has three critical gaps: **no logout test**, **no session-persistence test**, and **no mobile-viewport test** (375px / 768px). There are 2 known test failures logged in `test-results/` (notifications dropdown) that S01 needs to capture in the audit report.

One significant infrastructure blocker: `prisma/seed.js` throws a hard error when `DATABASE_URL` is a `postgres://` URL and `PRISMA_DATABASE_URL` is not set — it was written expecting Prisma Accelerate for PostgreSQL. The current `.env` only sets `DATABASE_URL` (Prisma Data Platform direct URL), not `PRISMA_DATABASE_URL`. This will break any `pnpm db:seed` run during test setup. The app's `lib/prisma.js` handles direct PG correctly with `@prisma/adapter-pg`; seed.js needs the same fix.

---

## Recommendation

Fix seed.js first (T01) so the database can be seeded. Then extract the duplicated `login()` helper into a shared fixture file (T02). Then run the full existing Playwright suite against the live app, capture pass/fail results as the audit report (T03), and add the missing tests: logout, session persistence, mobile sidebar collapse at 375px and 768px (T04).

---

## Implementation Landscape

### Key Files

- `lib/auth.js` — `getSession`, `verifyPassword`, `requireAuth`, `requireRole`, `createProtectedHandler`. Iron-session configured with cookie name `crm_session`, 7-day maxAge. SESSION_SECRET comes from env. No issues found.
- `pages/api/auth/login.js` — POST: validates email+password, updates `lastLoginAt`, writes iron-session, logs audit. Looks correct.
- `pages/api/auth/logout.js` — POST: reads session, logs audit, calls `session.destroy()`. Looks correct.
- `pages/api/auth/me.js` — GET: validates session cookie, fetches fresh user from DB (re-saves session on each check). Used by AuthContext on mount.
- `lib/AuthContext.js` — React context: `login()`, `logout()`, `isAuthenticated`, `user`, `permissions`. Redirects unauthenticated users to `/login?redirect=`. Role hierarchy: admin > manager > user.
- `pages/login.js` — Uses `useAuth().login()`, redirects to `/` or `router.query.redirect`. Has `LoginPage.getLayout = (page) => page` to skip the Layout wrapper.
- `pages/_app.js` — Wraps everything in `SettingsProvider` → `AuthProvider` → `I18nProvider`. Checks `isLoading` before rendering; shows spinner while auth check is in flight.
- `components/layout/Layout.js` — **Sidebar** is `position:fixed` on mobile, hidden via `-translate-x-full` (CSS transform), revealed via `isMobileMenuOpen` state. Mobile header at `lg:hidden` has hamburger (`aria-label="Open menu"`) and search icon. Settings link is filtered out for non-admin users (`permissions.canManageSettings`). Nav links: Contactos (`/`), Pipeline (`/deals`), Tareas (`/tasks`), Reportes (`/reports`), Configuración (`/settings`).
- `tests/e2e/crm.spec.js` — Main e2e suite. login() helper duplicated at top (fill email/password, click submit, waitForURL('/'), waitForSelector('nav')). All tests are visibility-only. No logout, no session persistence, no mobile viewport tests.
- `tests/e2e/settings.spec.js` — Additional settings tests with some save/persist verification (has logout in title but not in body).
- `tests/e2e/test.config.js` — `testUser.email = 'admin@hittek.com'`, `testUser.password = 'password123'`.
- `playwright.config.js` — Chromium only. `baseURL: http://localhost:3000`. `webServer: pnpm run dev`. `reuseExistingServer: true`.
- `prisma/seed.js` — **BLOCKER**: `createPrismaClient()` requires `DATABASE_URL` to start with `file:` (SQLite) OR `PRISMA_DATABASE_URL` to be set (Accelerate). With current `.env` (postgres:// URL, no `PRISMA_DATABASE_URL`), seed.js will throw `Error: DATABASE_URL must be SQLite (file:) or set PRISMA_DATABASE_URL for PostgreSQL`. Fix: add a third branch using `@prisma/adapter-pg` + `pg.Pool` (same pattern as `lib/prisma.js`).
- `lib/prisma.js` — App's Prisma client: uses `@prisma/adapter-pg` with `new Pool({ connectionString: DATABASE_URL })` when `PRISMA_DATABASE_URL` is absent. This pattern is what seed.js needs.
- `.env` — `DATABASE_URL` = remote Prisma Data Platform postgres URL. No `PRISMA_DATABASE_URL`. No local PG running (`pg_isready` returns not-ready) — the database is remote.

### Known Issues to Capture in Audit Report

- 2 test failures in `test-results/` directory:
  - `notifications-Notification-630d4-dropdown-when-clicking-bell-chromium`
  - `notifications-Notification-ad30c-otification-bell-in-sidebar-chromium`
  - The NotificationBell button has `aria-label={t('notifications.title') || 'Notificaciones'}` — the test selector `button[aria-label*="Notificaciones"]` should match. Likely fails because the test ran without a live server or seeded DB. Must re-run to confirm.

### Gaps the Planner Must Address as Tasks

1. **seed.js PostgreSQL fix** — add `@prisma/adapter-pg` branch to `prisma/seed.js` so `pnpm db:seed` works with the current `.env`.
2. **Shared login fixture** — extract `login(page)` from all 5 spec files into `tests/e2e/helpers/login.js` and import it. This is the "stable test helper: `login(page)` function" the slice promises to downstream slices.
3. **Run existing Playwright suite** — `pnpm test:e2e` against live dev server, capture pass/fail output as the audit report.
4. **Add missing tests to crm.spec.js**:
   - Logout: open user menu → click logout → assert redirect to `/login`
   - Session persistence: login, reload page, assert still authenticated (no redirect to `/login`)
   - Mobile sidebar at 375px: page.setViewportSize, click hamburger, assert sidebar visible, click overlay, assert sidebar hidden
   - Mobile sidebar at 768px: same flow

### Build Order

1. Fix `prisma/seed.js` first — nothing runs without a seeded DB. Also verify `pnpm db:seed` succeeds before proceeding.
2. Extract login helper to `tests/e2e/helpers/login.js` — unblocks all other spec files and downstream slices (S02–S05 all need it).
3. Run full existing suite → capture audit report (which tests pass, which fail, what interactions are broken).
4. Add logout, session-persistence, and mobile viewport tests.

### Verification

```bash
# Verify seed works
node prisma/seed.js

# Run full e2e suite (dev server must be running: pnpm dev in background)
pnpm test:e2e 2>&1 | tee audit-pass-results.txt

# Targeted auth + navigation tests
pnpm test:e2e --grep "Navigation|Auth|Login|Logout"
```

### Dependency Notes for Downstream Slices

S02–S05 all import `login(page)` — once it's in `tests/e2e/helpers/login.js`, each downstream spec just does:
```js
const { login } = require('./helpers/login')
```

The audit report (test run output) is the key deliverable: it tells S02–S05 exactly which interactions are broken and need fixing.
