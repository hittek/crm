# M010-sewkw9: Scheduled Reports, AI Builder, and Live Dashboard

**Vision:** A self-service report platform: users describe what they want in plain Spanish or English, Claude interprets it into a typed ReportDefinition, and the app renders it as a live dashboard of charts and tables. Every report is schedulable (daily, weekly, monthly) and notifies recipients when ready. The existing /reports page is the first built-in report and becomes fully customizable.

## Success Criteria

- User types 'negocios ganados por vendedor este mes' and gets a rendered bar chart + table within 5 seconds
- Every saved report can be set to daily/weekly/monthly schedule; ReportRun fires in org timezone
- Recipients get a push notification + email with a deep link when a scheduled run completes
- Adding a new report type (new entity, new aggregate) requires no changes outside lib/reports/
- Existing /reports dashboard is powered by the same engine (seeded ReportDefinition row, isBuiltIn=true)
- All report queries are org-scoped and cannot leak cross-org data

## Slices

- [x] **S01: Report data models and registry skeleton** `risk:low` `depends:[]`
  > After this: curl -X POST /api/internal/run-report -H 'x-internal-secret: ...' -d '{"reportId": 1}' → {runId: 1, status: 'pending'}

- [x] **S02: Claude NLP report builder endpoint** `risk:medium` `depends:[S01]`
  > After this: POST /api/reports/build {prompt: 'negocios ganados por vendedor este mes'} → {definition: {widgets: [{type:'bar_chart', ...}]}} in under 5s with streaming status updates

- [x] **S03: Query executor and chart renderer** `risk:high` `depends:[S01,S02]`
  > After this: User opens /reports — sees the same dashboard as today but powered by the report engine. User clicks 'Personalizar' and drags a new bar chart onto the canvas.

- [x] **S04: Scheduler with per-org timing and idempotency** `risk:medium` `depends:[S01,S03]`
  > After this: Container logs show 'scheduler_tick orgsChecked:1 triggered:1'; DB shows ReportRun row with status=delivered for today's window

- [x] **S05: Email and push delivery on completion** `risk:medium` `depends:[S04]`
  > After this: 8am: push notification 'Tu reporte está listo' arrives in browser. Email arrives: subject 'Reporte: Resumen diario — Hittek', body shows 3 KPI cards + View Report button.

- [x] **S06: Reports management UI and schedule settings** `risk:low` `depends:[S03,S05]`
  > After this: User types 'contactos nuevos por ciudad esta semana', sees bar chart preview appear in ~4s, clicks Guardar, sets schedule to 'Lunes 8am', saves. Next Monday a push notification arrives with the report link.

## Boundary Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                │
│  /reports          ReportCard[]  → GET /api/reports                    │
│  /reports/[id]     WidgetCanvas  → GET /api/reports/[id]/run           │
│  ChatBuilder panel              → POST /api/reports/build (streaming)  │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────────────┐
│  API Layer                                                               │
│  /api/reports/*             CRUD + build + run (auth-gated, org-scoped) │
│  /api/internal/run-report   trigger by id (INTERNAL_API_SECRET)         │
└──────┬──────────────────────────────┬───────────────────────────────────┘
       │                              │
┌──────▼──────────┐          ┌────────▼────────────────────────────────┐
│  lib/reports/   │          │  lib/scheduler.js                       │
│  registry.js    │          │  node-cron, every minute                │
│  base.js        │          │  nextRunAt(org,report) → UTC            │
│  executor.js    │◄─────────│  UNIQUE(orgId,reportId,windowKey) guard │
│  builder.js     │          └─────────────────────────────────────────┘
│  daily-digest.js│
└──────┬──────────┘
       │
┌──────▼──────────────────────────────────────────────────────────────┐
│  lib/deliverers/                                                     │
│  email.js (Resend)   push.js (webpush)   in-app.js (Notification)  │
└──────────────────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────┐
│  DB (Prisma)        │
│  ReportDefinition   │  id, orgId, name, prompt, definition(JSON),
│                     │  schedule(JSON), recipients(JSON), isBuiltIn
│  ReportRun          │  id, reportId, orgId, windowKey, status,
│                     │  result(JSON), createdAt, deliveredAt
└─────────────────────┘
```
