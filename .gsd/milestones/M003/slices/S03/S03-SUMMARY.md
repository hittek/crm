---
slice: S03
title: Chatbot Config UI & Sandbox
status: complete
commits: 781b706, 2a113fe, 501fe43, ba9356a, 5616034, d1320dc, cee5d2f, f285ddb, a5e945c, 9bbea7a
---

## What Was Built

**T01 — Schema** (`prisma db push` ✓)
- `Chatbot`: id, orgId, kbId, name, greeting, escalationPhrase, avatarUrl, primaryColor, apiKey, isActive
- `Conversation`: id, chatbotId, orgId, sessionId, channel, status, contactId, metadata + activity fields
- `ConversationMessage`: id, conversationId, role, content, userId, agentName
- `ConversationEvent`: id, conversationId, userId, type (picked_up/forwarded/joined/resolved/reopened), toUserId, note

**T02 — Chatbot management page (`/chatbots`)**
- List view with status badge, KB name, last-updated
- Create/edit modal: name, KB picker, greeting, escalation phrase, primary color, avatar URL
- Delete with confirmation
- Split-pane sandbox: click "Probar" to open ChatPanel inline alongside the bot list

**T03 — Sandbox persistence**
- `ChatPanel` generates a stable `sessionId` per mount (uuid())
- First message creates a `Conversation` row (`channel: 'sandbox'`)
- Every message pair persisted as `ConversationMessage`
- API uses chatbot greeting + name in system prompt when `chatbotId` provided

**T04 — Conversation list (`/conversations`)**
- Master-detail layout: left panel = filterable conversation list; right panel = full thread
- Filter by status (open / escalated / resolved) and channel
- Thread panel: unified message + event timeline sorted by createdAt
- Agent reply input with Enter-to-send; auto-polls every 5s while open/escalated
- Resolve / Reopen buttons; Transfer modal (select agent + optional note)
- Access control: unassigned → anyone; assigned → assignee + admin/manager
- Admin intervening → `joined` event recorded; message bubble shows actual agent name
- Read-only lock banner for non-privileged viewers
- Escalation banner on escalated threads
- Escalated count badge on sidebar nav item

## Key Decisions
- No public embed widget — channel traffic arrives via platform webhooks (M004)
- `ConversationEvent` for full audit trail of handoffs/resolutions
- `agentName` denormalized on `ConversationMessage` — avoids join on every poll
- `hasMinRole('manager')` = "admin or manager" for conversation access gate
- Dev server restart required after `prisma generate` to flush module cache

## Tests
- No new automated tests added (conversation UI is interaction-heavy; covered manually)
- Existing 96/96 Playwright suite unaffected

## Remaining Work in M003
- None — M003 is functionally complete; channel integrations (WhatsApp/Facebook/Telegram) are M004
