---
milestone: M003
title: AI Chatbot Platform Core
status: complete
closed: 2026-04-30
---

## Summary

M003 delivered a full AI chatbot platform on top of the existing PostgreSQL database using pgvector
for RAG retrieval and Anthropic Claude (haiku-4-5) for generation.

## What Was Shipped

### S01 — Knowledge Base Management
- KB CRUD (create, rename, delete)
- Document ingestion: PDF upload, URL scrape, manual Q&A
- Chunking pipeline with overlap; pgvector embeddings via Prisma `$queryRaw`
- Async background processing (child_process spawn, 256MB cap) — eliminates OOM
- Startup self-heal: stale `processing` docs reset to `failed` on boot
- UI: full KB management page at `/chatbot` with document list, retry on error

### S02 — RAG Engine & Claude Integration
- Cosine similarity retrieval over `KnowledgeBaseChunk` via pgvector `<=>` operator
- Streaming SSE responses (`claude-haiku-4-5-20251001`)
- Plain-text system prompt — no markdown, suitable for WhatsApp/Facebook downstream
- Chat API: `POST /api/chatbot/[kbId]/chat`

### S03 — Chatbot Config UI & Sandbox
- Chatbot model: name, KB link, greeting, escalation phrase, avatar, primary color, apiKey
- `/chatbots` management page: list + create/edit/delete modal + inline sandbox
- Sandbox persists every conversation (`channel: 'sandbox'`) via stable sessionId per mount
- Chatbot greeting + name injected into system prompt

### S04 — Conversation Management UI
- `/conversations` master-detail: filterable list + inline thread panel
- Unified message + event timeline (messages and events sorted by createdAt)
- Agent reply input (Enter to send), auto-polls every 5s while open/escalated
- Resolve / Reopen / Transfer actions
- Access control: unassigned → anyone; assigned → assignee + admin/manager
- Admin intervention → `joined` event recorded with attribution
- `agentName` on each agent message — shows real name in thread
- Escalated count badge on sidebar nav
- `ConversationEvent` audit trail: picked_up, forwarded, joined, resolved, reopened

## Schema Additions
- `KnowledgeBase`, `KnowledgeBaseDocument`, `KnowledgeBaseChunk`
- `Chatbot`, `Conversation`, `ConversationMessage` (with userId + agentName)
- `ConversationEvent` (full handoff audit log)
- Plan limits: trial=0 KBs, starter=1 (10 docs/5MB), pro=5 (100 docs/50MB), enterprise=unlimited

## What's NOT in M003
- Channel integrations (WhatsApp, Facebook, Telegram) → M004
- Public embed widget → dropped (not needed; channels use platform webhooks)
- Contact linking on conversations → M004
