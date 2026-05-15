---
estimated_steps: 3
estimated_files: 2
skills_used: []
---

# T01: Fix BUG-2 (contact detail selector) and BUG-4 (notification bell locale)

Two fast test fixes:
1. BUG-2: crm.spec.js 'should select a contact and show detail panel' and 'should show contact status dropdown in detail' use `page.locator('main button').first()` which hits the 'Nuevo contacto' button, not a contact row. Fix: use `page.locator('main .flex-1.overflow-y-auto button').first()` to scope to the scrollable contact list.
2. BUG-4: notifications.spec.js uses `button[aria-label*="Notificaciones"]` which fails in English locale. Fix: change to `button[aria-label*="Notificaciones"], button[aria-label*="Notifications"]` or use a regex `button[aria-label]` scoped to aside. Update all 5 notification UI tests that depend on finding the bell.

## Inputs

- `tests/e2e/crm.spec.js`
- `tests/e2e/notifications.spec.js`
- `components/layout/NotificationBell.js`

## Expected Output

- `tests/e2e/crm.spec.js — contact detail selector fixed`
- `tests/e2e/notifications.spec.js — bell aria-label selector handles both locales`

## Verification

pnpm test:e2e --grep 'select a contact|status dropdown|notification bell|open notification|empty state|close dropdown' --workers=1 --reporter=line 2>&1 | tail -10
