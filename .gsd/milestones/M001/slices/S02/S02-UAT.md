# S02: Contacts CRUD Fix & Verification — UAT

**Milestone:** M001
**Written:** 2026-04-29T20:51:02.032Z

# S02 UAT — Contacts CRUD & Bug Fixes

## Verified Behaviors

### Bug Fixes
- [x] Contact detail panel opens when clicking a contact row (not the Nuevo button)
- [x] Notification bell found by aria-label in both English and Spanish locales
- [x] Notification dropdown opens and shows header text in current locale
- [x] Kanban stage column headers matched by `.kanban-column h3` (avoids hidden mobile pills)
- [x] Won/Lost kanban zones matched by bg-green-50/bg-red-50 container classes

### Contacts CRUD
- [x] Create a contact via the Nuevo button → contact appears in list
- [x] Select a contact → detail panel opens, Email label visible
- [x] Edit company field inline (click InlineEdit span → fill input → Enter) → value persists in panel
- [x] Delete a contact via the delete button → confirm dialog → contact removed from list

### Full Suite Baseline
- [x] notifications.spec.js: 8/8 tests passing (fully fixed)
- [x] 57/88 tests passing overall
- [x] BUG-7 locale contamination documented for S03 fix

