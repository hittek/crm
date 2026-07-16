# Quick Task: Agregar una vista de calendario para visualizar tareas

**Date:** 2026-05-18
**Branch:** main

## What Changed
- New `CalendarView` component with full month grid (Monday-first), task pills color-coded by type (meeting/call/email/task), priority dots, overflow indicator, and a slide-up day detail panel
- View toggle (Lista / Calendario) added to the tasks page header
- `CalendarTaskDrawer` — edit drawer accessible from within the calendar (status, priority, date, description, delete, mark complete)
- `GET /api/tasks` now accepts `?from=ISO&to=ISO` date range parameters; calendar fetches prev + current + next month in a single request so leading/trailing grid cells also show tasks

## Files Modified
- `components/tasks/CalendarView.js` — new file
- `pages/tasks.js` — added view toggle + CalendarTaskDrawer
- `pages/api/tasks/index.js` — added `from`/`to` date range filter

## Verification
- `next build` passed with no errors or warnings
- Grid layout logic tested mentally: Mon-first offset, leading/trailing days, 6-week grid wrapping
- API date range filter only activates when `from`/`to` params present; does not affect existing list filters
