---
id: T02
parent: S05
milestone: M008
key_files:
  - pages/conversations.js
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-07-21T20:44:59.488Z
blocker_discovered: false
---

# T02: Conversations UI shows violet Chatwoot badge and link button for chatwoot-channel convs

**Conversations UI shows violet Chatwoot badge and link button for chatwoot-channel convs**

## What Happened

Added chatwoot to CHANNEL_META (violet badge). Added chatwootConvUrl derivation from sessionId. Added Chatwoot link button in thread header that opens the Chatwoot conversation in a new tab.

## Verification

grep -c chatwoot pages/conversations.js → 8

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `grep -c 'chatwoot' pages/conversations.js` | 0 | ✅ pass — 8 references | 50ms |

## Deviations

chatwootConvUrl derived client-side from sessionId (no extra API round-trip). Chatwoot URL hardcoded to chatwoot.hittek.mx in component (env var available on server but not client without NEXT_PUBLIC_).

## Known Issues

None.

## Files Created/Modified

- `pages/conversations.js`
