---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Run full Playwright suite and write audit-report.md

Run the complete existing Playwright test suite against the live app (playwright.config.js auto-starts the dev server via webServer: pnpm run dev). Capture the full stdout/stderr output. Parse pass/fail results per test. Write tests/e2e/audit-report.md with: run date, total counts (passed/failed/skipped), a table of every test case with its result, and for failed tests the error message and file:line. This is the primary audit deliverable promised by the slice roadmap — it tells S02–S05 exactly which interactions are broken.

## Inputs

- ``tests/e2e/crm.spec.js` — (with refactored login import from T02)`
- ``tests/e2e/settings.spec.js` — settings tests`
- ``tests/e2e/notifications.spec.js` — known failures expected here`
- ``playwright.config.js` — config: baseURL http://localhost:3000, webServer: pnpm run dev, reuseExistingServer: true`

## Expected Output

- ``tests/e2e/audit-report.md` — markdown file with run date, pass/fail/skip counts, table of all test names with result, error details for failures, and a summary section noting all broken interactions`

## Verification

test -f tests/e2e/audit-report.md && grep -c '|' tests/e2e/audit-report.md | awk '{exit ($1 < 3) ? 1 : 0}' && echo 'audit report exists with table rows'

## Observability Impact

audit-report.md is the durable baseline record; playwright-report/ HTML report provides drill-down; test-results/ directory contains screenshots of every failure — future agents read audit-report.md first to triage which slices need fixing
