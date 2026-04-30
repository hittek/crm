---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Add deals pipeline CRUD Playwright tests

Add test.describe('Deals Pipeline CRUD') to crm.spec.js with: create a deal via form (appears in correct kanban column), open deal drawer (fields load), update deal stage via select (not drag), mark deal won. Drag-drop is flaky on Pi4 — use the status select in DealDrawer instead.

## Inputs

- `tests/e2e/crm.spec.js`
- `components/deals/Pipeline.js`
- `components/deals/DealDrawer.js`
- `components/deals/DealForm.js`

## Expected Output

- `tests/e2e/crm.spec.js with Deals Pipeline CRUD describe block (3+ tests passing)`

## Verification

pnpm test:e2e --grep 'Deals Pipeline CRUD' --workers=1 --reporter=line
