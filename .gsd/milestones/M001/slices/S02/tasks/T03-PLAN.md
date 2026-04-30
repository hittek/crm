---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T03: Add contacts CRUD Playwright tests

Add a new test.describe('Contacts CRUD', ...) block to crm.spec.js covering the full lifecycle:
1. Create contact: click 'Nuevo' button in contact list header, fill firstName='Test', lastName='Contact', email='test.contact@example.com', submit, assert contact appears in list
2. Edit contact: click the newly created contact, wait for detail panel, find edit button, change company to 'ACME Corp', save, assert updated value visible in detail
3. Status change: in the detail panel, change status select to a non-active value, assert chip updates in the list
4. Delete contact: find delete button in detail panel, click, confirm dialog, assert contact removed from list
All steps import login() from ./helpers/login. Each sub-test is independent (uses beforeEach with login + fresh contact creation where needed) to avoid order dependency.

## Inputs

- `tests/e2e/crm.spec.js`
- `components/contacts/ContactDetail.js`
- `components/contacts/ContactForm.js`
- `pages/api/contacts/index.js`

## Expected Output

- `tests/e2e/crm.spec.js — Contacts CRUD describe block with 4 tests, all passing`

## Verification

pnpm test:e2e --grep 'Contacts CRUD' --workers=1 --reporter=line 2>&1 | tail -10
