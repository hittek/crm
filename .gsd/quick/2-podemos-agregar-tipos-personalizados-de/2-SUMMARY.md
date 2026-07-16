# Quick Task: Custom task types configurable in settings

**Date:** 2026-05-18
**Branch:** main

## What Changed
- **Settings > Tareas tab**: new UI to manage task types — emoji picker, label, and two toggles per custom type: "Requiere contacto" and "Google Maps". Built-in types (task/call/email/meeting) are read-only. Custom types can be added/deleted.
- **SettingsContext**: added `taskTypes`, `DEFAULT_TASK_TYPES` constant, and `useTaskTypes()` hook
- **Settings API**: `taskTypes` persisted in `orgSettings` JSON alongside `dealStages`/`contactStatuses`
- **TaskForm**: type selector now dynamic from settings; contact search picker with 250ms debounce shown for all tasks, required (validated) when `type.requiresContact = true`
- **TaskList row**: type icon replaced with emoji from settings
- **TaskList drawer**: type buttons dynamic; Google Maps button shown when `type.showMapsLink = true` and task has a linked contact with an address
- **CalendarView**: type icon in pills and detail panel replaced with emoji from settings
- **GET /api/tasks + /api/tasks/[id]**: contact `select` now includes `address, city, state, country, postalCode` fields for the Maps link

## Files Modified
- `pages/api/settings/index.js` — added taskTypes to DEFAULT_SETTINGS, GET merge, PUT persist
- `lib/SettingsContext.js` — DEFAULT_TASK_TYPES, taskTypes state, useTaskTypes hook
- `components/tasks/TaskForm.js` — dynamic types, contact search, requiresContact validation
- `components/tasks/TaskList.js` — emoji type icon in row + drawer, Maps link in drawer
- `components/tasks/CalendarView.js` — emoji type icon via useTaskTypes
- `pages/settings.js` — Tareas tab with CRUD UI
- `pages/api/tasks/index.js` — contact address fields in select
- `pages/api/tasks/[id].js` — contact address fields in select

## Verification
- `next build` passed with no errors
- Built-in types are protected (delete button disabled, label read-only)
- Custom type flow: Settings → add "Instalación" 🔧 → requiresContact ✓ → showMapsLink ✓ → save → TaskForm shows it → drawer shows Maps button when contact has address
