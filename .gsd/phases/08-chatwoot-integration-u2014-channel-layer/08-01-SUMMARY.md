---
id: S02b
parent: M008
milestone: M008
provides:
  - ensureOrgProvisioned idempotent helper
  - updateAgentBot for webhook/name sync
  - AgentBot webhook URLs include ?botKey for S03 routing
requires:
  []
affects:
  []
key_files:
  - lib/chatwoot.js
  - pages/api/admin/orgs.js
  - pages/api/chatbot/bots/index.js
  - pages/api/chatbot/bots/[id].js
key_decisions:
  - AgentBot webhook URL uses ?botKey={apiKey} query param for chatbot routing in S03
  - All Chatwoot calls are non-blocking — errors logged but never block the CRM operation
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-07-21T20:09:59.326Z
blocker_discovered: false
---

# S02b: Org and Chatbot Lifecycle Hooks

**Full org+chatbot lifecycle wired to Chatwoot — every creation path provisions, every chatbot change syncs**

## What Happened

All org creation paths (signup + admin panel) now auto-provision Chatwoot. All chatbot lifecycle events (create/rename/delete) sync to the Chatwoot AgentBot. Existing chatbots backfilled with botKey-aware webhook URLs.

## Verification

All lifecycle hooks confirmed; app healthy; AgentBot URLs verified via Chatwoot Platform API

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

listOrgs function header was accidentally dropped during edit — caught and fixed before deploy. Existing chatbot AgentBot webhooks backfilled manually.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `lib/chatwoot.js` — Added ensureOrgProvisioned (idempotent) and updateAgentBot functions
- `pages/api/admin/orgs.js` — Added POST /api/admin/orgs for admin org creation with Chatwoot provisioning
- `pages/api/auth/signup.js` — Refactored to use ensureOrgProvisioned
- `pages/api/chatbot/bots/index.js` — Added AgentBot webhook sync on chatbot create
- `pages/api/chatbot/bots/[id].js` — Added AgentBot name sync on PATCH, webhook reset on DELETE
