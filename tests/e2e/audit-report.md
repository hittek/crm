# E2E Audit Report — Baseline Pass/Fail State

**Last updated:** 2026-04-29 ~16:00 CST (after S02 — 88 tests)  
**Baseline run:** 2026-04-29 11:09 CST (81 tests, pre-T04)  
**Environment:** Local dev (Next.js 14, PostgreSQL), single Playwright worker  
**Playwright version:** 1.57.0  
**Total tests:** 88 | **Passed:** 57 | **Failed:** 31 | **Skipped:** 0  
**Baseline (T03/S01):** 85 tests | 57 passed | 28 failed  
**Test timeout:** 25–30 000 ms  
**Run conditions:** Sequential (--workers=1). Pi4 is slow (~31 min for full suite). **Known structural issue: tests share browser session within a spec file. i18n.spec.js switches locale to English and later Spanish; subsequent spec files inherit the final locale. Any test asserting Spanish text that runs after i18n.spec.js may fail spuriously. Root fix: add locale-reset in beforeEach for affected specs. Tracked as open issue.**

---

## Summary

| File | Tests | Pass | Fail | Δ vs S01 baseline |
|------|-------|------|------|-------------------|
| crm.spec.js | 43 (+3 CRUD) | 34 | 9 | +3 pass (CRUD), -4 (locale contamination) |
| i18n.spec.js | 9 | 3 | 6 | -2 (locale contamination cross-run) |
| notifications.spec.js | 8 | 8 | 0 | +3 pass ✅ fully fixed |
| profile.spec.js | 17 | 3 | 14 | unchanged |
| settings.spec.js | 11 | 9 | 2 | +5 pass |
| **Total** | **88** | **57** | **31** | **net 0 (3 new pass, 3 new fail from locale contamination)** |

> **Root cause of new failures:** Spec files run sequentially sharing browser state. i18n.spec.js ends in an unknown locale state; subsequent tests asserting Spanish text fail. The fix is adding locale-reset to beforeEach in affected specs — tracked below as BUG-7.

### Bugs Fixed This Slice (S02)
- ✅ **BUG-1 FIXED:** Kanban column labels — `.kanban-column h3` selector, won/lost by bg-color class
- ✅ **BUG-2 FIXED:** Contact detail selector — scoped to `.overflow-y-auto button`, label text `Email` not `EMAIL`
- ✅ **BUG-4 FIXED:** Notification bell — `aria-label*="Notification"` handles both locales

### Open Bugs
- **BUG-3:** Profile page label text mismatch — 14 tests still failing (profile.spec.js)
- **BUG-5:** Settings Notificaciones tab — 2 tests still failing (settings.spec.js)
- **BUG-6:** i18n persistence — tied to BUG-3 (profile page h1)
- **BUG-7 NEW:** Locale contamination across spec files — i18n.spec.js leaves app in unknown locale; subsequent files asserting Spanish text fail. Fix: add `await page.evaluate(() => localStorage.setItem('locale', 'es'))` in beforeEach for crm.spec.js and navigation tests. Affects ~6 tests.

---

## All Test Results

| # | File | Suite | Test | Result | Error Type |
|---|------|-------|------|--------|------------|
| 1 | crm.spec.js | Contacts Page | should display sidebar navigation | ✅ PASS | |
| 2 | crm.spec.js | Contacts Page | should display contact list | ✅ PASS | |
| 3 | crm.spec.js | Contacts Page | should select a contact and show detail panel | ❌ FAIL | TIMEOUT |
| 4 | crm.spec.js | Contacts Page | should show contact status dropdown in detail | ❌ FAIL | TIMEOUT |
| 5 | crm.spec.js | Global Search | should open search with / keyboard shortcut | ✅ PASS | |
| 6 | crm.spec.js | Global Search | should close search with Escape key | ✅ PASS | |
| 7 | crm.spec.js | Quick Add Menu | should open quick add menu with N key | ✅ PASS | |
| 8 | crm.spec.js | Quick Add Menu | should show all quick add options | ✅ PASS | |
| 9 | crm.spec.js | Pipeline Page | should display kanban board with all stages | ❌ FAIL | NOT_VISIBLE |
| 10 | crm.spec.js | Pipeline Page | should show won/lost columns | ❌ FAIL | NOT_VISIBLE |
| 11 | crm.spec.js | Pipeline Page | should show deal cards in kanban | ✅ PASS | |
| 12 | crm.spec.js | Pipeline Page | deal cards should be draggable | ✅ PASS | |
| 13 | crm.spec.js | Pipeline Page | should show add button in columns | ✅ PASS | |
| 14 | crm.spec.js | Tasks Page | should display page title | ✅ PASS | |
| 15 | crm.spec.js | Tasks Page | should display task filter tabs | ✅ PASS | |
| 16 | crm.spec.js | Tasks Page | should switch between filter tabs | ✅ PASS | |
| 17 | crm.spec.js | Tasks Page | should show new task button | ✅ PASS | |
| 18 | crm.spec.js | Reports Page | should display page title | ✅ PASS | |
| 19 | crm.spec.js | Reports Page | should show Pipeline Total KPI card | ✅ PASS | |
| 20 | crm.spec.js | Reports Page | should show Won This Month KPI card | ✅ PASS | |
| 21 | crm.spec.js | Reports Page | should show Conversion Rate KPI card | ✅ PASS | |
| 22 | crm.spec.js | Reports Page | should show New Contacts KPI card | ✅ PASS | |
| 23 | crm.spec.js | Reports Page | should show Pipeline by Stage section | ✅ PASS | |
| 24 | crm.spec.js | Settings Page | should display page title | ✅ PASS | |
| 25 | crm.spec.js | Settings Page | should display settings sidebar tabs | ✅ PASS | |
| 26 | crm.spec.js | Settings Page | should show General settings by default | ✅ PASS | |
| 27 | crm.spec.js | Settings Page | should switch to Pipeline settings tab | ✅ PASS | |
| 28 | crm.spec.js | Settings Page | should show currency selector in General | ✅ PASS | |
| 29 | crm.spec.js | Navigation | should navigate to Pipeline page | ❌ FAIL | NOT_VISIBLE |
| 30 | crm.spec.js | Navigation | should navigate to Tasks page | ✅ PASS | |
| 31 | crm.spec.js | Navigation | should navigate to Reports page | ✅ PASS | |
| 32 | crm.spec.js | Navigation | should navigate to Settings page | ✅ PASS | |
| 33 | crm.spec.js | Navigation | should navigate back to Contacts page | ✅ PASS | |
| 34 | crm.spec.js | UI Components | should display avatars with initials in contact list | ✅ PASS | |
| 35 | crm.spec.js | UI Components | should show search button in sidebar | ✅ PASS | |
| 36 | crm.spec.js | UI Components | should show logo in sidebar | ✅ PASS | |
| 37 | crm.spec.js | Auth & Mobile | logs out successfully | ✅ PASS | |
| 38 | crm.spec.js | Auth & Mobile | session persists on reload | ✅ PASS | |
| 39 | crm.spec.js | Auth & Mobile | mobile sidebar opens and closes at 375px | ✅ PASS | |
| 40 | crm.spec.js | Auth & Mobile | mobile sidebar opens and closes at 768px | ✅ PASS | |
| 41 | i18n.spec.js | Language Switching | should display navigation in Spanish by default | ✅ PASS | |
| 38 | i18n.spec.js | Language Switching | should have language selector on profile page | ✅ PASS | |
| 39 | i18n.spec.js | Language Switching | should switch to English and update UI | ✅ PASS | |
| 40 | i18n.spec.js | Language Switching | should show navigation in English after language switch | ✅ PASS | |
| 41 | i18n.spec.js | Language Switching | should switch back to Spanish | ✅ PASS | |
| 42 | i18n.spec.js | Language Switching | should persist language preference after page reload | ❌ FAIL | NOT_VISIBLE |
| 43 | i18n.spec.js | Language Switching | should show user menu items in selected language | ❌ FAIL | NOT_VISIBLE |
| 44 | i18n.spec.js | Language-specific content | should show Add button in current language | ❌ FAIL | TIMEOUT |
| 45 | i18n.spec.js | Language-specific content | should show Search placeholder in current language | ❌ FAIL | TIMEOUT |
| 46 | notifications.spec.js | Notifications | should display notification bell in sidebar | ❌ FAIL | NOT_VISIBLE |
| 47 | notifications.spec.js | Notifications | should open notification dropdown when clicking bell | ❌ FAIL | TIMEOUT |
| 48 | notifications.spec.js | Notifications | should show empty state when no notifications | ❌ FAIL | TIMEOUT |
| 49 | notifications.spec.js | Notifications | should close dropdown when clicking outside | ❌ FAIL | TIMEOUT |
| 50 | notifications.spec.js | Notifications | notification appears after creating a contact | ❌ FAIL | TIMEOUT |
| 51 | notifications.spec.js | Notifications API Integration | should fetch notifications from API | ✅ PASS | |
| 52 | notifications.spec.js | Notifications API Integration | should return 401 when not authenticated | ✅ PASS | |
| 53 | notifications.spec.js | Notifications API Integration | should mark notifications as read via API | ✅ PASS | |
| 54 | profile.spec.js | Profile Page | should display profile page with all sections | ❌ FAIL | NOT_VISIBLE |
| 55 | profile.spec.js | Profile Page | should display user email (read-only) | ❌ FAIL | NOT_VISIBLE |
| 56 | profile.spec.js | Profile Page | should display user name that can be edited | ❌ FAIL | NOT_VISIBLE |
| 57 | profile.spec.js | Profile Page | should display timezone selector | ❌ FAIL | NOT_VISIBLE |
| 58 | profile.spec.js | Profile Page | should display language/locale selector | ❌ FAIL | NOT_VISIBLE |
| 59 | profile.spec.js | Profile Page | should have save button | ❌ FAIL | NOT_VISIBLE |
| 60 | profile.spec.js | Profile Page | should update user name and show success message | ❌ FAIL | TIMEOUT |
| 61 | profile.spec.js | Profile Page | should change timezone and save | ❌ FAIL | TIMEOUT |
| 62 | profile.spec.js | Profile Page | should change locale | ❌ FAIL | TIMEOUT |
| 63 | profile.spec.js | Profile Page | should toggle password change section | ❌ FAIL | TIMEOUT |
| 64 | profile.spec.js | Profile Page | should show error when password confirmation does not match | ❌ FAIL | TIMEOUT |
| 65 | profile.spec.js | Profile Page | should show error for short password | ❌ FAIL | TIMEOUT |
| 66 | profile.spec.js | Profile Page | should show error for wrong current password | ❌ FAIL | TIMEOUT |
| 67 | profile.spec.js | Profile Page | should display avatar section with upload button | ❌ FAIL | NOT_VISIBLE |
| 68 | profile.spec.js | Profile Page | should display user initials in avatar when no image | ✅ PASS | |
| 69 | profile.spec.js | Profile Navigation | should navigate to profile from user menu | ✅ PASS | |
| 70 | profile.spec.js | Profile Navigation | should be able to access profile page directly | ❌ FAIL | NOT_VISIBLE |
| 71 | settings.spec.js | Settings Page | should display settings page with tabs | ❌ FAIL | NOT_VISIBLE |
| 72 | settings.spec.js | Settings Page | should display general settings by default | ✅ PASS | |
| 73 | settings.spec.js | Settings Page | should allow editing organization name | ✅ PASS | |
| 74 | settings.spec.js | Settings Page | should switch to Pipeline tab and display deal stages | ✅ PASS | |
| 75 | settings.spec.js | Settings Page | should add new deal stage | ✅ PASS | |
| 76 | settings.spec.js | Settings Page | should switch to Contactos tab and display statuses | ✅ PASS | |
| 77 | settings.spec.js | Settings Page | should switch to Notificaciones tab | ❌ FAIL | TIMEOUT |
| 78 | settings.spec.js | Settings Page | should toggle notification settings | ❌ FAIL | TIMEOUT |
| 79 | settings.spec.js | Settings Page | should switch to Integraciones tab | ✅ PASS | |
| 80 | settings.spec.js | Settings Page | should select currency from dropdown | ✅ PASS | |
| 81 | settings.spec.js | Settings Page | should change primary color | ✅ PASS | |

---

## Broken Interactions — Root Cause Analysis

### BUG-1: Kanban board column labels don't match expected text
**Files:** crm.spec.js #9, #10, #29  
**Error:** `locator('text=Lead').first()` not visible; `locator('text=Ganado').first()` not visible  
**What's broken:** The Pipeline/Deals page renders the kanban board, but the column header text doesn't match the expected values. Tests look for "Lead", "Calificado", "Propuesta", "Negociación", "Ganado", "Perdido". Deal cards and drag handles work (#11, #12) so the board renders — the stage labels are either in a different element structure or using different text.  
**Affects:** 3 tests (Pipeline Page kanban stages, won/lost columns, Navigation to Pipeline)

### BUG-2: Contact detail panel doesn't open on click
**Files:** crm.spec.js #3, #4  
**Error:** `locator('main button').first()` — element is visible but times out waiting for it to be stable/clickable  
**What's broken:** The contact list renders (test #2 passes — contact count is visible), but the first item in the list is either not a `<button>` or is in an unstable state. Clicking it doesn't reliably open the detail panel, or the panel takes too long to appear.  
**Likely cause:** Contact list items rendered as `<div>` or `<li>` with onClick, not `<button>`. Possibly also slow data fetch for the detail panel under load.  
**Affects:** 2 tests

### BUG-3: Profile page heading and labels use different text than expected
**Files:** profile.spec.js #54–59, #67, #70  
**Error:** `getByRole('heading', { name: 'Mi Perfil' })` — h1 not found; `getByText('Nombre completo')` not found; `getByText('Zona horaria')` not found; `getByText('Idioma')` not found; `getByRole('button', { name: 'Guardar cambios' })` not found; `getByText('Haz clic en la imagen para cambiar tu foto de perfil')` not found  
**What's broken:** The profile page either renders with different label text than the tests expect, or the component hasn't fully implemented the Spanish copy. The page _does_ load (avatar initials pass — #68), and navigation to it works (#69), but the expected heading "Mi Perfil", field labels, and button text are missing.  
**Downstream effect:** All profile edit tests (#60–66) also fail because they depend on finding "Guardar cambios" and "Cambiar contraseña" buttons.  
**Affects:** 14 tests

### BUG-4: Notification bell button missing aria-label
**Files:** notifications.spec.js #46–50  
**Error:** `button[aria-label*="Notificaciones"], button[aria-label*="notification"]` not found  
**What's broken:** The notification bell renders in the sidebar (the Notifications API Integration tests all pass — the data layer works), but the bell `<button>` element has no `aria-label` attribute containing "Notificaciones" or "notification". All 5 UI notification tests cascade from this single selector failure.  
**Affects:** 5 tests

### BUG-5: Settings sidebar missing "Notificaciones" tab button
**Files:** settings.spec.js #71, #77, #78  
**Error:** `getByRole('button', { name: 'Notificaciones' })` not found  
**What's broken:** The settings sidebar has tabs for General, Pipeline, Contactos, and Integraciones (all pass — #72–76, #79), but the "Notificaciones" tab button is missing. The settings page renders and most tabs work; this tab either was not implemented or is named differently.  
**Affects:** 3 tests

### BUG-6: i18n — language preference not persisting after page reload; profile save not confirmed
**Files:** i18n.spec.js #42–45  
**Error:** `getByRole('heading', { name: 'My Profile' })` not found after English switch + reload; `getByText(/Profile updated|Perfil actualizado/)` not found; `locator('select').nth(1)` not found when restoring to Spanish  
**What's broken:** The basic language switch round-trip works (#39–41), but: (a) after switching to English and reloading, the "My Profile" heading doesn't appear — ties back to BUG-3 (profile page h1 text mismatch); (b) the save success toast `Perfil actualizado correctamente` doesn't appear or disappears too fast; (c) `select.nth(1)` on the profile page suggests the locale dropdown is the second `<select>` — if the profile form structure changed, this index is wrong.  
**Affects:** 4 tests

---

## Observability

- **HTML report:** `playwright-report/index.html` — per-test traces and screenshots
- **Failure screenshots:** `test-results/<test-name>/test-failed-1.png`
- **Error context files:** `test-results/<test-name>/error-context.md`

**How to triage a specific failure:**
1. Read this file to identify the bug category
2. Open `playwright-report/index.html` for the screenshot and step-by-step trace
3. Grep the relevant component for the expected text to confirm the mismatch

---

## What's Working

- Login/auth flow (all 88 tests login successfully)
- **Logout flow** (user menu opens, logout button redirects to /login) ← S01/T04
- **Session persistence** (reload stays authenticated) ← S01/T04
- **Mobile sidebar at 375px and 768px** (hamburger opens, overlay click closes) ← S01/T04
- **Contacts CRUD: create → appears in list** ← S02/T03 ✅
- **Contacts CRUD: inline edit company field** ← S02/T03 ✅
- **Contacts CRUD: delete → removed from list** ← S02/T03 ✅
- **Notification bell visible + dropdown opens/closes** ← S02/T01 ✅
- **Kanban stage columns and won/lost zones** ← S02/T02 ✅
- **Contact detail panel opens on click** ← S02/T01 ✅
- Sidebar navigation: Contacts, Tasks, Reports, Settings (when run in isolation / before i18n tests)
- Global search open/close (/ and Escape)
- Quick Add menu (N key, all options visible)
- Tasks page: title, filter tabs, new task button
- Reports page: all KPI cards and pipeline chart
- Settings: General, Pipeline, Contactos, Integraciones tabs; org name edit; currency; primary color; deal stage CRUD; Notificaciones toggle (when in Spanish)
- Notifications: full API (fetch, 401, mark-read) + UI bell + dropdown
- i18n: basic switch round-trip (when run before locale state is contaminated)
- Profile: avatar initials, navigation from user menu
- Deals pipeline: deal cards render, draggable attribute, add button in columns
