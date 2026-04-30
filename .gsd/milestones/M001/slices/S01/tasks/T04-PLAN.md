---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T04: Add logout, session-persistence, and mobile sidebar tests to crm.spec.js

Three critical gaps in the current suite: no logout test, no session-persistence test, no mobile viewport tests. These are required to satisfy R001 (CRM flows validated) and R030 (responsive 375px/768px). Add four new tests to crm.spec.js in a new describe block 'Auth & Mobile': (1) logs out successfully — login, click user menu button at sidebar bottom, click logout button (contains logout icon text), assert redirect to /login; (2) session persists on reload — login, page.reload(), assert URL is still '/' and nav is visible; (3) mobile sidebar opens and closes at 375px — setViewportSize(375,812), login, click hamburger aria-label='Open menu', assert sidebar is visible (not translate-x-full), click the fixed overlay div or close button, assert sidebar hidden; (4) mobile sidebar at 768px — same flow with viewport 768x1024. All tests import login() from ./helpers/login.

## Inputs

- ``tests/e2e/crm.spec.js` — base file to add tests to (with login() imported from T02)`
- ``tests/e2e/helpers/login.js` — shared login helper from T02`
- ``components/layout/Layout.js` — reference for sidebar toggle mechanism: hamburger has aria-label='Open menu', user menu button is in `.p-4.border-t` section, logout button has text from t('nav.logout') (Spanish: 'Cerrar sesión'), overlay is a `fixed inset-0 z-10` div`

## Expected Output

- ``tests/e2e/crm.spec.js` — 4 new tests added in a `test.describe('Auth & Mobile', ...)` block: logout, session-persistence, mobile-375, mobile-768`

## Verification

pnpm test:e2e --grep 'logs out|session persists|mobile sidebar' 2>&1 | tail -20
