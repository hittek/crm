---
id: T04
parent: S01
milestone: M008
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T18:47:14.994Z
blocker_discovered: false
---

# T04: Chatwoot stack live at https://chatwoot.hittek.mx

**Chatwoot stack live at https://chatwoot.hittek.mx**

## What Happened

Reserved chatwoot.hittek.mx ngrok domain. Brought up chatwoot-app, chatwoot-sidekiq, and ngrok-chatwoot containers. All healthy. Verified Chatwoot responds at https://chatwoot.hittek.mx — 302 on HTML route (SPA redirect), 401 on API POST with wrong credentials confirms Rails auth stack is live.

## Verification

curl POST /auth/sign_in → HTTP 401 (auth stack live)

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `curl -X POST https://chatwoot.hittek.mx/auth/sign_in -H 'Content-Type: application/json' -d '{"email":"t@t.com","password":"x"}' -w '%{http_code}'` | 0 | ✅ pass — HTTP 401 | 400ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
