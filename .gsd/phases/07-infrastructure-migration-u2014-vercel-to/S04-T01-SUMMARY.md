---
id: T01
parent: S04
milestone: M007
key_files:
  - .env
key_decisions:
  - NGROK_DOMAIN, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BASE_URL all updated to crm.hittek.mx
duration: 
verification_result: passed
completed_at: 2026-07-21T17:39:21.573Z
blocker_discovered: false
---

# T01: crm.hittek.mx DNS pointed to RPi4 via ngrok custom domain, health endpoint confirmed live

**crm.hittek.mx DNS pointed to RPi4 via ngrok custom domain, health endpoint confirmed live**

## What Happened

User reserved crm.hittek.mx in ngrok dashboard. Updated .env NGROK_DOMAIN/NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_BASE_URL to crm.hittek.mx. Recreated ngrok container via docker compose up -d. DNS propagated from old crm-hittek.ngrok.app CNAME to ngrok-provided CNAME. curl https://crm.hittek.mx/api/health returns {status:ok,db:ok} with no Vercel headers.

## Verification

curl -sf https://crm.hittek.mx/api/health returns {status:ok,db:ok}

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -sf https://crm.hittek.mx/api/health` | 0 | ✅ pass | 900ms |

## Deviations

ngrok requires domain reservation before CNAME — had to delete CNAME first, reserve in dashboard, then add ngrok-provided CNAME. Also docker compose restart does not re-read .env; used `up -d` to recreate container.

## Known Issues

None.

## Files Created/Modified

- `.env`
