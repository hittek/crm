---
id: T03
parent: S01
milestone: M001
key_files:
  - tests/e2e/audit-report.md
  - playwright-report/index.html
key_decisions:
  - Used --workers=1 sequential execution because parallel runs (2–4 workers) produced near-total timeouts due to dev server overload on a resource-constrained host under ffmpeg load
  - Used --reporter=line (incremental stdout) not --reporter=json (writes only on process exit) so partial results survive a kill
  - Parsed failure blocks by file+describe+name key, not by numeric index — the N) counter in line reporter is failure sequence number, not test position number
duration: 
verification_result: passed
completed_at: 2026-04-29T17:12:04.783Z
blocker_discovered: false
---

# T03: Ran full 81-test Playwright suite sequentially; 49 pass, 32 fail; wrote tests/e2e/audit-report.md with per-test results and 6 root-cause bug categories

**Ran full 81-test Playwright suite sequentially; 49 pass, 32 fail; wrote tests/e2e/audit-report.md with per-test results and 6 root-cause bug categories**

## What Happened

**Infrastructure challenges:** The host (Raspberry Pi) was running 4 parallel ffmpeg FLAC→AAC conversions consuming 45–67% CPU each throughout the run, and Playwright's parallel execution (4 workers) caused the dev server to be overwhelmed — initial runs with 2–4 workers produced nearly all timeouts. Switched to --workers=1 (sequential) to eliminate cross-test load interference, giving the most reliable results obtainable under these conditions.

**Test run:** 81 tests, --workers=1, --timeout=25000ms, --reporter=line. The sequential run completed in 25.1 minutes. Output was captured to /tmp/pw-seq.txt and parsed with a Python script matching failure blocks by file+describe+name (not by numeric index, which is a different counter).

**Results:** 49 passed / 32 failed. The Playwright HTML report was generated in playwright-report/ and per-test failure screenshots are in test-results/.

**Root causes identified (6 bugs):**
1. **BUG-1** — Kanban column labels: `text=Lead` and `text=Ganado` not visible on /deals. Deal cards exist and are draggable, so the board renders; the column header element structure doesn't match the locators. Affects 3 tests.
2. **BUG-2** — Contact detail panel: `locator('main button').first()` never becomes stable/clickable. Contact list count renders, but list items are likely not `<button>` elements. Affects 2 tests.
3. **BUG-3** — Profile page text mismatches: h1 heading is not "Mi Perfil", field labels "Nombre completo"/"Zona horaria"/"Idioma", button text "Guardar cambios"/"Cambiar contraseña", and avatar hint text all missing. Avatar initials and navigation TO profile both work; the form labels and heading don't match. Affects 14 tests.
4. **BUG-4** — Notification bell aria-label: bell button has no aria-label with "Notificaciones" or "notification". API layer works (3 API integration tests pass). Affects 5 tests.
5. **BUG-5** — Settings "Notificaciones" tab missing: General/Pipeline/Contactos/Integraciones tabs work; Notificaciones tab button not found. Affects 3 tests.
6. **BUG-6** — i18n profile save cascade: language switch works (5 tests pass) but persistence after reload and save confirmation toast fail; root partly tied to BUG-3 (profile heading mismatch). Affects 4 tests.

**What works:** Login, sidebar nav, global search, quick-add menu, tasks page, all reports KPIs, settings (5 of 6 tabs), notifications API, i18n basic switching, profile navigation and avatar initials, deals board render.

## Verification

Ran: `test -f tests/e2e/audit-report.md && grep -c '|' tests/e2e/audit-report.md | awk '{exit ($1 < 3) ? 1 : 0}' && echo 'audit report exists with table rows'` → passed. The playwright run itself: 49 passed, 32 failed, exit code 1 (expected for a partial-failure run).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `test -f tests/e2e/audit-report.md && grep -c '|' tests/e2e/audit-report.md | awk '{exit ($1 < 3) ? 1 : 0}' && echo 'audit report exists with table rows'` | 0 | ✅ pass | 50ms |
| 2 | `npx playwright test --reporter=line --timeout=25000 --workers=1 (sequential run, 25.1 min)` | 1 | ✅ pass (exit 1 expected: 49 pass / 32 fail) | 1506000ms |

## Deviations

Used --reporter=line redirected to /tmp/pw-seq.txt rather than --reporter=json, because the json reporter only writes output at process exit and would produce nothing if killed mid-run. Also ran with --workers=1 rather than default parallel execution due to host resource constraints.

## Known Issues

Run was performed under moderate CPU load (4 ffmpeg processes). Some TIMEOUT failures (especially crm.spec.js contact detail #3/#4, i18n late tests #44/#45) may be partially load-induced. All NOT_VISIBLE failures are genuine selector/UI mismatches independent of load. A clean re-run after conversion finishes would confirm which timeouts were load-induced vs genuine.

## Files Created/Modified

- `tests/e2e/audit-report.md`
- `playwright-report/index.html`
