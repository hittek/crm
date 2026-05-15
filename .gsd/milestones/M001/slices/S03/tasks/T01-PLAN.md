---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Fix BUG-7 locale contamination in crm.spec.js and navigation tests

Add localStorage locale-reset to beforeEach in crm.spec.js test groups affected by i18n state contamination. Also audit and fix the search-button-in-sidebar test and settings sidebar tabs test that are failing in full suite.

## Inputs

- `tests/e2e/crm.spec.js`
- `tests/e2e/audit-report.md`

## Expected Output

- `tests/e2e/crm.spec.js with locale reset in beforeEach`

## Verification

pnpm test:e2e --grep 'sidebar navigation|Settings Page.*sidebar|search button in sidebar|navigate to Tasks|navigate to Reports|navigate to Settings|navigate back' --workers=1 --reporter=line
