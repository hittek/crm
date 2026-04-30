# E2E Audit Report — Baseline Pass/Fail State

**Last updated:** 2026-04-30 (after S03 — 91 tests)
**Environment:** Local dev (Next.js 14, PostgreSQL), single Playwright worker
**Node:** v24.14.0 | **Playwright:** 1.57.0
**Total tests:** 91 | **Passed:** 81 | **Failed:** 10 | **Skipped:** 0
**Run conditions:** Sequential (--workers=1)

---

## Summary by Slice

| Slice | Change | Before | After |
|-------|--------|--------|-------|
| S01 | Baseline nav/auth | — | 57/88 |
| S02 | Contacts CRUD, kanban selectors, notifications UI | 57/88 | 57/88 |
| S03 | BUG-7 locale fix, Deals CRUD tests (+3), deals.js fix | 57/88 | **81/91** |

---

## S03 Results

| File | Tests | Pass | Fail | Δ vs S02 |
|------|-------|------|------|----------|
| crm.spec.js | 46 | 46 | 0 | +9 (BUG-7 fixed, 3 CRUD added, auth+mobile restored) |
| i18n.spec.js | 9 | 9 | 0 | +6 (BUG-7 fixed) |
| notifications.spec.js | 8 | 8 | 0 | +1 (notification after create contact fixed) |
| profile.spec.js | 17 | 10 | 7 | +7 pass (new tests), BUG-3 still open |
| settings.spec.js | 11 | 8 | 3 | +6 pass (new tests), BUG-5 still open |
| **Total** | **91** | **81** | **10** | **+24 pass, 91 vs 88 tests** |

---

## Bugs Fixed This Slice (S03)

- ✅ **BUG-7 FIXED:** Locale contamination — `resetLocale()` added to `beforeEach` in crm.spec.js and settings.spec.js. i18n tests now isolated.
- ✅ **DealForm product bug FIXED:** `pages/deals.js` was passing `onSubmit` (wrong prop) and missing `isOpen` — DealForm modal never opened in the real app. Fixed to `isOpen={showForm}` + `onSave={handleFormSubmit}`.
- ✅ **Deals CRUD tests added:** create deal (appears in Lead column), open drawer (close button + title visible), change stage via select — all passing.
- ✅ **Kanban column selectors fixed:** `.kanban-column h3:has-text("Lead")` instead of `text=Lead`.
- ✅ **Won/Lost column selectors fixed:** `.bg-green-50` / `.bg-red-50` instead of `text=Ganado`.
- ✅ **Contact detail panel fixed:** scoped to `.overflow-y-auto button`, label text `"Email"` not `"EMAIL"`.

---

## Open Bugs

| ID | Description | Tests Affected |
|----|-------------|---------------|
| BUG-3 | Profile page missing Spanish labels: "Mi Perfil", "Nombre completo", "Zona horaria", "Idioma", "Guardar cambios", "Cambiar contraseña", "Haz clic en la imagen..." | profile.spec.js: 7 failing |
| BUG-5 | Settings "Notificaciones" tab button missing | settings.spec.js: 3 failing |

Note: profile tests 1–8 pass when running after crm/i18n/notifications specs (session state from prior locale reset). Failing in isolation is consistent with BUG-3 — profile page renders with a different locale when no prior localStorage state exists.

---

## All Test Results (S03)

### crm.spec.js (46/46 pass)

| # | Suite | Test | Result |
|---|-------|------|--------|
| 1 | Contacts Page | should display sidebar navigation | ✅ |
| 2 | Contacts Page | should display contact list | ✅ |
| 3 | Contacts Page | should select a contact and show detail panel | ✅ |
| 4 | Contacts Page | should show contact status dropdown in detail | ✅ |
| 5 | Global Search | should open search with / keyboard shortcut | ✅ |
| 6 | Global Search | should close search with Escape key | ✅ |
| 7 | Quick Add Menu | should open quick add menu with N key | ✅ |
| 8 | Quick Add Menu | should show all quick add options | ✅ |
| 9 | Pipeline Page | should display kanban board with all stages | ✅ |
| 10 | Pipeline Page | should show won/lost columns | ✅ |
| 11 | Pipeline Page | should show deal cards in kanban | ✅ |
| 12 | Pipeline Page | deal cards should be draggable | ✅ |
| 13 | Pipeline Page | should show add button in columns | ✅ |
| 14 | Tasks Page | should display page title | ✅ |
| 15 | Tasks Page | should display task filter tabs | ✅ |
| 16 | Tasks Page | should switch between filter tabs | ✅ |
| 17 | Tasks Page | should show new task button | ✅ |
| 18 | Reports Page | should display page title | ✅ |
| 19 | Reports Page | should show Pipeline Total KPI card | ✅ |
| 20 | Reports Page | should show Won This Month KPI card | ✅ |
| 21 | Reports Page | should show Conversion Rate KPI card | ✅ |
| 22 | Reports Page | should show New Contacts KPI card | ✅ |
| 23 | Reports Page | should show Pipeline by Stage section | ✅ |
| 24 | Settings Page | should display page title | ✅ |
| 25 | Settings Page | should display settings sidebar tabs | ✅ |
| 26 | Settings Page | should show General settings by default | ✅ |
| 27 | Settings Page | should switch to Pipeline settings tab | ✅ |
| 28 | Settings Page | should show currency selector in General | ✅ |
| 29 | Navigation | should navigate to Pipeline page | ✅ |
| 30 | Navigation | should navigate to Tasks page | ✅ |
| 31 | Navigation | should navigate to Reports page | ✅ |
| 32 | Navigation | should navigate to Settings page | ✅ |
| 33 | Navigation | should navigate back to Contacts page | ✅ |
| 34 | Auth & Mobile | logs out successfully | ✅ |
| 35 | Auth & Mobile | session persists on reload | ✅ |
| 36 | Auth & Mobile | mobile sidebar opens and closes at 375px | ✅ |
| 37 | Auth & Mobile | mobile sidebar opens and closes at 768px | ✅ |
| 38 | Contacts CRUD | creates a contact and it appears in the list | ✅ |
| 39 | Contacts CRUD | selects a contact, edits company field inline | ✅ |
| 40 | Contacts CRUD | deletes a contact and it disappears from the list | ✅ |
| 41 | Deals Pipeline CRUD | creates a deal and it appears in the Lead column | ✅ |
| 42 | Deals Pipeline CRUD | opens deal drawer by clicking a deal card | ✅ |
| 43 | Deals Pipeline CRUD | changes deal stage via drawer select | ✅ |
| 44 | UI Components | should display avatars with initials in contact list | ✅ |
| 45 | UI Components | should show search button in sidebar | ✅ |
| 46 | UI Components | should show logo in sidebar | ✅ |

### i18n.spec.js (9/9 pass)

| # | Suite | Test | Result |
|---|-------|------|--------|
| 47 | Language Switching | should display navigation in Spanish by default | ✅ |
| 48 | Language Switching | should have language selector on profile page | ✅ |
| 49 | Language Switching | should switch to English and update UI | ✅ |
| 50 | Language Switching | should show navigation in English after language switch | ✅ |
| 51 | Language Switching | should switch back to Spanish | ✅ |
| 52 | Language Switching | should persist language preference after page reload | ✅ |
| 53 | Language Switching | should show user menu items in selected language | ✅ |
| 54 | Language-specific content | should show Add button in current language | ✅ |
| 55 | Language-specific content | should show Search placeholder in current language | ✅ |

### notifications.spec.js (8/8 pass)

| # | Suite | Test | Result |
|---|-------|------|--------|
| 56 | Notifications | should display notification bell in sidebar | ✅ |
| 57 | Notifications | should open notification dropdown when clicking bell | ✅ |
| 58 | Notifications | should show empty state when no notifications | ✅ |
| 59 | Notifications | should close dropdown when clicking outside | ✅ |
| 60 | Notifications | notification appears after creating a contact | ✅ |
| 61 | Notifications API Integration | should fetch notifications from API | ✅ |
| 62 | Notifications API Integration | should return 401 when not authenticated | ✅ |
| 63 | Notifications API Integration | should mark notifications as read via API | ✅ |

### profile.spec.js (10/17 pass)

| # | Suite | Test | Result | Bug |
|---|-------|------|--------|-----|
| 64 | Profile Page | should display profile page with all sections | ✅* | |
| 65 | Profile Page | should display user email (read-only) | ✅* | |
| 66 | Profile Page | should display user name that can be edited | ✅* | |
| 67 | Profile Page | should display timezone selector | ✅* | |
| 68 | Profile Page | should display language/locale selector | ✅* | |
| 69 | Profile Page | should have save button | ✅* | |
| 70 | Profile Page | should update user name and show success message | ✅* | |
| 71 | Profile Page | should change timezone and save | ✅* | |
| 72 | Profile Page | should change locale | ❌ | BUG-3 |
| 73 | Profile Page | should toggle password change section | ❌ | BUG-3 |
| 74 | Profile Page | should show error when password confirmation does not match | ❌ | BUG-3 |
| 75 | Profile Page | should show error for short password | ❌ | BUG-3 |
| 76 | Profile Page | should show error for wrong current password | ❌ | BUG-3 |
| 77 | Profile Page | should display avatar section with upload button | ❌ | BUG-3 |
| 78 | Profile Page | should display user initials in avatar when no image | ✅ | |
| 79 | Profile Navigation | should navigate to profile from user menu | ✅ | |
| 80 | Profile Navigation | should be able to access profile page directly | ❌ | BUG-3 |

\* Passes in full suite (after crm/i18n/notifications establish locale state). Fails in isolation — profile page renders with wrong locale when no prior localStorage state.

### settings.spec.js (8/11 pass)

| # | Suite | Test | Result | Bug |
|---|-------|------|--------|-----|
| 81 | Settings Page | should display settings page with tabs | ❌ | BUG-5 |
| 82 | Settings Page | should display general settings by default | ✅ | |
| 83 | Settings Page | should allow editing organization name | ✅ | |
| 84 | Settings Page | should switch to Pipeline tab and display deal stages | ✅ | |
| 85 | Settings Page | should add new deal stage | ✅ | |
| 86 | Settings Page | should switch to Contactos tab and display statuses | ✅ | |
| 87 | Settings Page | should switch to Notificaciones tab | ❌ | BUG-5 |
| 88 | Settings Page | should toggle notification settings | ❌ | BUG-5 |
| 89 | Settings Page | should switch to Integraciones tab | ✅ | |
| 90 | Settings Page | should select currency from dropdown | ✅ | |
| 91 | Settings Page | should change primary color | ✅ | |

---

## What's Working (After S03)

- ✅ Login/logout, session persistence, mobile sidebar (375px + 768px)
- ✅ All sidebar navigation links
- ✅ Global search (open/close)
- ✅ Quick add menu (N key, all options)
- ✅ Contacts page: list, detail panel, status dropdown
- ✅ Contacts CRUD: create → appears in list, inline edit, delete
- ✅ Pipeline kanban: all stage columns render, deal cards visible, draggable
- ✅ **Deals CRUD: create deal (Lead column), open drawer, change stage** ← S03 ✅
- ✅ **DealForm modal: fixed prop bug (isOpen + onSave)** ← S03 ✅
- ✅ Tasks page: title, filter tabs, new task button
- ✅ Reports page: all KPI cards, pipeline chart
- ✅ Settings: General, Pipeline, Contactos, Integraciones tabs; org name; currency; color; deal stage add
- ✅ i18n: full round-trip (ES→EN→ES), persistence on reload, language-specific content
- ✅ Notifications: bell, dropdown, empty state, create-contact trigger, full API (fetch/401/mark-read)
- ✅ Profile: user initials avatar, navigation from user menu, name/timezone/locale updates (in full suite)

## Still Broken (S04/S05 work)

- ❌ **BUG-3:** Profile page "Guardar cambios" / "Cambiar contraseña" button text mismatch, "Mi Perfil" heading missing. 7 tests fail. Root: profile page renders with different labels than tests expect (locale or copy issue).
- ❌ **BUG-5:** Settings "Notificaciones" tab button missing. 3 tests fail.

---

## Observability

- **HTML report:** `playwright-report/index.html`
- **Failure screenshots:** `test-results/<test-name>/test-failed-1.png`
- **Error context:** `test-results/<test-name>/error-context.md`
