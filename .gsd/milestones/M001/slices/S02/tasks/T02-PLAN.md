---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T02: Fix BUG-1 (kanban column label text mismatch)

crm.spec.js Pipeline tests look for 'text=Lead', 'text=Calificado', 'text=Propuesta', 'text=Negociación', 'text=Ganado', 'text=Perdido'. Check what text is actually rendered in components/deals/Pipeline.js column headers. The seed data sets stage names — grep for the actual values and either fix the test selectors to match reality or (if the stage names are wrong) fix the seed/component. Also check navigation test 'should navigate to Pipeline page' which waits for 'text=Lead'.

## Inputs

- `components/deals/Pipeline.js`
- `prisma/seed.js`
- `tests/e2e/crm.spec.js`

## Expected Output

- `tests/e2e/crm.spec.js — kanban stage label selectors match actual rendered text`

## Verification

pnpm test:e2e --grep 'kanban board|won/lost|navigate to Pipeline' --workers=1 --reporter=line 2>&1 | tail -10
