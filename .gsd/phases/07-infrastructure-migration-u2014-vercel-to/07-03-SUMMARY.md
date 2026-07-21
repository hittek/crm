---
id: S03
parent: M007
milestone: M007
provides:
  - (none)
requires:
  []
affects:
  []
key_files:
  - docker-compose.yaml
  - .env
key_decisions:
  - linux/amd64 is the correct platform for this x86_64 host
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T17:24:48.668Z
blocker_discovered: false
---

# S03: ngrok Static Domain Tunnel

**ngrok static domain crm-hittek.ngrok.app is live and survives docker compose restarts**

## What Happened

T01 had already set the ngrok credentials. T02 uncovered an exec format error from an ARM64 platform mismatch in docker-compose.yaml. Fixed platform, rebuilt, confirmed all 4 containers healthy (app, postgres, redis, ngrok). Verified https://crm-hittek.ngrok.app/api/health returns {status:ok,db:ok} on first boot and after a full down+up cycle.

## Verification

curl https://crm-hittek.ngrok.app/api/health returns 200 {status:ok,db:ok} both before and after full restart cycle.

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

docker-compose.yaml had build platform set to linux/arm64 on an x86_64 host — fixed to linux/amd64 before proceeding.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `docker-compose.yaml` — Changed build platform from linux/arm64 to linux/amd64
- `.env` — NGROK_AUTHTOKEN, NGROK_DOMAIN, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_BASE_URL set to real values (T01)
