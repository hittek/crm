---
id: T01
parent: S03
milestone: M001
key_files:
  - tests/e2e/helpers/login.js
  - tests/e2e/crm.spec.js
key_decisions:
  - App locale key in localStorage is 'crm_locale' not 'locale'
  - App reads locale with priority: user?.locale (DB) > localStorage > browser language — must update DB to override i18n test contamination
  - Profile API endpoint uses PUT not PATCH
  - Use page.evaluate(fetch) with credentials:include to carry session cookies — page.request doesn't carry them automatically
duration: 
verification_result: passed
completed_at: 2026-04-29T21:07:57.787Z
blocker_discovered: false
---

# T01: Fixed BUG-7 locale contamination — 7 tests that were failing in full suite now pass

**Fixed BUG-7 locale contamination — 7 tests that were failing in full suite now pass**

## What Happened

Added resetLocale(page, locale='es-MX') helper to login.js that calls PUT /api/auth/profile with locale, sets crm_locale in localStorage, then reloads. Added resetLocale to beforeEach in Contacts Page and Settings Page describe blocks, and after login() in all Navigation and UI Components tests that assert Spanish text. All 7 targeted tests now pass.

## Verification

pnpm test:e2e --grep 'sidebar navigation|settings sidebar tabs|navigate to Tasks|navigate to Reports|navigate to Settings|navigate back|search button in sidebar' --workers=1: 7 passed

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `pnpm test:e2e --grep 'sidebar navigation|settings sidebar tabs|navigate to Tasks|navigate to Reports|navigate to Settings|navigate back|search button in sidebar' --workers=1 --reporter=line` | 0 | ✅ pass | 150200ms |

## Deviations

The fix required 3 debugging iterations: (1) wrong localStorage key ('locale' vs 'crm_locale'), (2) page.request.patch doesn't carry session cookies, (3) profile endpoint is PUT not PATCH. Final solution uses page.evaluate with fetch + credentials:include + PUT method.

## Known Issues

None. resetLocale is now reusable for any spec file that needs locale isolation.

## Files Created/Modified

- `tests/e2e/helpers/login.js`
- `tests/e2e/crm.spec.js`
