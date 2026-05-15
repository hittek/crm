---
id: T02
parent: S01
milestone: M001
key_files:
  - tests/e2e/helpers/login.js
  - tests/e2e/crm.spec.js
  - tests/e2e/settings.spec.js
  - tests/e2e/i18n.spec.js
  - tests/e2e/notifications.spec.js
  - tests/e2e/profile.spec.js
key_decisions:
  - helpers/login.js uses CommonJS (module.exports) since package.json has no type:module and playwright.config.js is CJS
  - profile.spec.js keeps its testUser import because testUser.email is referenced in two test assertions outside login()
duration: 
verification_result: passed
completed_at: 2026-04-28T19:56:24.343Z
blocker_discovered: false
---

# T02: Extracted shared login() to tests/e2e/helpers/login.js and updated all 5 spec files to import from it

**Extracted shared login() to tests/e2e/helpers/login.js and updated all 5 spec files to import from it**

## What Happened

All five spec files (crm.spec.js, settings.spec.js, i18n.spec.js, notifications.spec.js, profile.spec.js) contained an identical `async function login(page)` that navigates to /login, fills credentials from testUser, clicks submit, and waits for URL '/' and nav selector.

Created `tests/e2e/helpers/login.js` as a CommonJS module that imports testUser from `../test.config` and exports the canonical login() implementation. The helper path uses relative `../test.config` since it sits one level deeper in `helpers/`.

Updated all five spec files:
- `crm.spec.js` and `notifications.spec.js` (CJS): removed `const { testUser } = require('./test.config')` and the local login() block; added `const { login } = require('./helpers/login')`.
- `settings.spec.js`, `i18n.spec.js`, `profile.spec.js` (ESM-style headers with `import`, but mixing `require()` for local modules as already established): same removal + addition.
- `profile.spec.js` is the only file that uses `testUser` outside login() (lines 40 and 237 reference `testUser.email` in test assertions), so its `const { testUser } = require('./test.config')` line was kept alongside the new helper import.

Module format choice: CommonJS (.js with `module.exports`) was used for the helper because: (1) package.json has no `"type": "module"`, defaulting to CJS; (2) playwright.config.js is CJS; (3) all cross-file imports in the spec suite already use `require()`. The ESM-style `import` lines in some specs are processed by Playwright's transformer and can coexist with `require()` calls.

## Verification

Ran two checks:
1. `node -e "const m = require('./tests/e2e/helpers/login.js'); console.log(typeof m.login === 'function' ? 'OK' : 'FAIL')"` → output: `OK` (exit 0)
2. `grep -L 'async function login' tests/e2e/crm.spec.js ... | wc -l` → output: `5` (all 5 files have no local login definition)
3. Confirmed all 5 files contain `require('./helpers/login')` via grep.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `node -e "const m = require('./tests/e2e/helpers/login.js'); console.log(typeof m.login === 'function' ? 'OK' : 'FAIL')"` | 0 | ✅ pass | 120ms |
| 2 | `grep -L 'async function login' tests/e2e/crm.spec.js tests/e2e/settings.spec.js tests/e2e/i18n.spec.js tests/e2e/notifications.spec.js tests/e2e/profile.spec.js | wc -l | grep -q '^5$' && echo 'all 5 files updated'` | 0 | ✅ pass | 80ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `tests/e2e/helpers/login.js`
- `tests/e2e/crm.spec.js`
- `tests/e2e/settings.spec.js`
- `tests/e2e/i18n.spec.js`
- `tests/e2e/notifications.spec.js`
- `tests/e2e/profile.spec.js`
