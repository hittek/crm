---
id: S04
parent: M007
milestone: M007
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - .env
key_decisions:
  - crm.hittek.mx routes via ngrok custom domain reservation, not a plain CNAME to crm-hittek.ngrok.app
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T17:39:36.688Z
blocker_discovered: false
---

# S04: Custom Domain Migration (crm.hittek.mx)

**crm.hittek.mx is live on RPi4 Docker stack via ngrok custom domain — Vercel removed from path**

## What Happened

Reserved crm.hittek.mx in ngrok dashboard. Updated .env to point all URL vars at the custom domain. Recreated ngrok container. DNS propagated. https://crm.hittek.mx/api/health confirmed live with {status:ok,db:ok} — Vercel no longer in the request path.

## Verification

https://crm.hittek.mx/api/health returns {status:ok,db:ok} with no Vercel headers.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

ngrok requires domain reservation before CNAME can be set. docker compose restart doesn't re-read .env — container must be recreated with `up -d`.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `.env` — NGROK_DOMAIN, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BASE_URL updated to crm.hittek.mx
