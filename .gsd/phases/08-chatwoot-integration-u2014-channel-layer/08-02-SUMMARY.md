---
id: S02
parent: M008
milestone: M008
provides:
  - chatwootAccountId + chatwootAgentBotId on every Organization
  - lib/chatwoot.js Platform API client
  - AgentBot webhook URLs registered pointing to /api/chatbot/agentbot/{slug}
requires:
  []
affects:
  []
key_files:
  - lib/chatwoot.js
  - pages/api/auth/signup.js
  - prisma/schema.prisma
key_decisions:
  - PlatformApp token (not super_admin user token) required for Platform API
  - Provisioning failure on signup is non-blocking — logged but does not reject the request
  - CHATWOOT_URL uses internal Docker hostname (chatwoot-app:3000) for server-side calls
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T19:56:01.174Z
blocker_discovered: false
---

# S02: Multi-tenant Org Provisioning via Platform API

**Multi-tenant Chatwoot provisioning wired — all 5 orgs have Chatwoot accounts + AgentBots, new signups auto-provision**

## What Happened

Added chatwoot fields to Organization, created Platform API client, hooked provisioning into signup, and backfilled all 5 existing orgs. Each org now has a Chatwoot account and global AgentBot ready for S03.

## Verification

All 5 orgs have chatwootAccountId + chatwootAgentBotId in DB; Platform API confirms accounts exist

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

Backfill ran via bash inside Docker containers instead of the node script (production image has no source files). PlatformApp token required creating a PlatformApp model instance — the super_admin user token is a different auth path.

## Known Limitations

AgentBot webhook URL is registered but the /api/chatbot/agentbot/[slug] endpoint doesn't exist yet (built in S03).

## Follow-ups

None.

## Files Created/Modified

- `prisma/schema.prisma` — Added chatwootAccountId and chatwootAgentBotId nullable Int fields
- `lib/chatwoot.js` — Chatwoot Platform API client with provisionOrg helper
- `pages/api/auth/signup.js` — Chatwoot provisioning hooked into signup flow
- `scripts/backfill-chatwoot.js` — Backfill script for existing orgs
- `.env` — Added CHATWOOT_URL and CHATWOOT_PLATFORM_TOKEN
