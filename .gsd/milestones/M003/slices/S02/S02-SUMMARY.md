---
slice: S02
title: RAG Engine & Claude Integration
status: complete
commit: b519d28
---

## What shipped

- **pgvector extension** enabled on Prisma Postgres (v0.8.1)
- **`KnowledgeBaseChunk.embedding vector(512)`** column added via `prisma db push`
- **`lib/embeddings.js`** — `embedTexts(texts)`: single Voyage AI batch call, `MAX_TEXTS=100` hard cap, no retries
- **`lib/rag.js`** — `searchChunks()`: 1 Voyage call (embed query) + 1 raw SQL cosine similarity query (`<=>` operator), top-K=5
- **`embedChunks(documentId)`** in `documents/index.js`: called after `persistChunks`; fetches chunk IDs, embeds all in one call, updates via `$transaction`
- **Startup backfill IIFE**: on module load, embeds all `embedded=false` chunks (≤100 guard); backfilled 17 existing chunks on first boot
- **`/api/chatbot/[kbId]/chat.js`**: SSE streaming endpoint — 1 Voyage + 1 Anthropic call per message; `max_tokens: 800` hard cap; plain-text system prompt (no markdown — chatbots target WhatsApp/Facebook channels)
- **`components/chatbot/ChatPanel.js`**: streaming chat UI with SSE reader, loading cursor, error state
- **`pages/chatbot.js`**: ChatPanel replaces teaser banner when KB `status=ready`
- **`Icons.send`** added to Icons registry
- Model: `claude-haiku-4-5-20251001` (only haiku available on this account)

## Spending guards
- `embedTexts()` throws if input > 100 (hard cap, prevents loop accidents)
- Each document index = exactly 1 Voyage API call
- Each chat message = 1 Voyage + 1 Anthropic call; no retries
- Claude `max_tokens: 800`

## Verified
- 17 chunks embedded on startup (one Voyage batch)
- `¿Cuál es el horario de atención?` → correct answer streamed from chunk
- `¿Qué políticas de soporte técnico tienen?` → correct multi-point answer from URL-scraped chunk
