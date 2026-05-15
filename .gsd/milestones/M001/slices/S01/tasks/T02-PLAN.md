---
estimated_steps: 1
estimated_files: 6
skills_used: []
---

# T02: Extract shared login() helper to tests/e2e/helpers/login.js

All five spec files (crm.spec.js, settings.spec.js, i18n.spec.js, notifications.spec.js, profile.spec.js) define an identical async login(page) function at the top. This is the slice's primary contract deliverable — downstream slices S02–S05 all import `const { login } = require('./helpers/login')`. Extract to a single shared file, import testUser credentials from test.config.js, and update all five spec files to remove their local definitions and import from helpers/login instead.

## Inputs

- ``tests/e2e/crm.spec.js` — source of the canonical login() implementation to extract`
- ``tests/e2e/test.config.js` — exports testUser { email, password } used by login()`
- ``tests/e2e/settings.spec.js` — has duplicate login() at line 5`
- ``tests/e2e/i18n.spec.js` — has duplicate login() at line 5`
- ``tests/e2e/notifications.spec.js` — has duplicate login() at line 9`
- ``tests/e2e/profile.spec.js` — has duplicate login() at line 5`

## Expected Output

- ``tests/e2e/helpers/login.js` — new file exporting `async function login(page)` that reads testUser from test.config.js, fills email/password inputs, clicks submit, waits for URL '/' and nav selector`
- ``tests/e2e/crm.spec.js` — local login() definition removed, replaced with `const { login } = require('./helpers/login')``
- ``tests/e2e/settings.spec.js` — same refactor`
- ``tests/e2e/i18n.spec.js` — same refactor`
- ``tests/e2e/notifications.spec.js` — same refactor`
- ``tests/e2e/profile.spec.js` — same refactor`

## Verification

node -e "const m = require('./tests/e2e/helpers/login.js'); console.log(typeof m.login === 'function' ? 'OK' : 'FAIL')" && grep -L 'async function login' tests/e2e/crm.spec.js tests/e2e/settings.spec.js tests/e2e/i18n.spec.js tests/e2e/notifications.spec.js tests/e2e/profile.spec.js | wc -l | grep -q '^5$' && echo 'all 5 files updated'
