---
id: T01
parent: S03
milestone: M007
key_files:
  - .env
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-17T18:39:44.171Z
blocker_discovered: false
---

# T01: ngrok credentials set in .env, app URLs updated to static domain

**ngrok credentials set in .env, app URLs updated to static domain**

## What Happened

Collected real NGROK_AUTHTOKEN and NGROK_DOMAIN via secure_env_collect. Updated NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_BASE_URL from localhost:3000 to https://crm-hittek.ngrok.app.

## Verification

NGROK_DOMAIN=crm-hittek.ngrok.app, NGROK_AUTHTOKEN set, NEXT_PUBLIC_APP_URL/BASE_URL=https://crm-hittek.ngrok.app

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep NGROK_AUTHTOKEN .env | grep -v placeholder` | 0 | ✅ pass | 30ms |

## Deviations

NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_BASE_URL were localhost — updated to the ngrok static domain.

## Known Issues

None.

## Files Created/Modified

- `.env`
