---
id: M003/S01
title: Knowledge Base Management
status: complete
commit: 8e306fa
date: 2026-05-05
---

## What was built

**Schema** — Three new Prisma models: `KnowledgeBase` (one per org/chatbot), `KnowledgeBaseDocument` (PDF/URL/Q&A source), `KnowledgeBaseChunk` (text fragment ready for embedding). Applied via `prisma db push`.

**Plan limits** — `knowledgeBases` (0/1/5/∞) and `kbDocuments` (0/50/200/∞) added to `PLAN_LIMITS` and `checkPlanLimit` countMap.

**APIs** — Full CRUD for knowledge bases and documents:
- `GET/POST /api/chatbot/knowledge-bases`
- `GET/PUT/DELETE /api/chatbot/knowledge-bases/[id]`
- `GET/POST /api/chatbot/knowledge-bases/[id]/documents`
- `DELETE /api/chatbot/knowledge-bases/[id]/documents/[docId]`

**Document ingestion pipeline** — Three source types:
1. **PDF** → Vercel Blob upload → `pdf-parse` text extraction → `chunkText()`
2. **URL** → `node:https` direct (no compression) + `cheerio` DOM parse → `chunkText()`
3. **Q&A** → `chunkQA()` → single self-contained chunk

**lib/chunker.js** — `chunkText()` splitter: 1600-char chunks with 80-char overlap, breaks at `\n\n` or sentence boundaries. `chunkQA()` produces one `Q:\nA:` chunk.

**pages/chatbot.js** — Two-panel UI: KB list (left) + document list (right). Modals for creating KBs and adding sources (PDF/URL/Q&A tabs). UpgradeWall for `trial` plan. S02 sandbox teaser banner.

**Sidebar** — "Chatbot" nav entry with `FiCpu` icon; `nav.chatbot` i18n key added.

## Verified
- Q&A ingestion: `POST → 201, chunkCount: 1` ✓
- URL scraping: `node:https + cheerio` verified in isolation ✓
- Production build: `next build` succeeds, all 4 chatbot routes compile ✓
- KB status lifecycle: empty → indexing → ready ✓

## Dev note
URL scraping triggers OOM on the local dev machine (18GB physical RAM, mostly in use) because cold-initializing Prisma's TLS connection pool concurrently with an external HTTPS request creates a memory spike. Works correctly on Vercel (warm Prisma connection, per-request memory isolation).

## Remaining (S02)
- pgvector extension + embedding column on `KnowledgeBaseChunk`
- Embedding pipeline (OpenAI `text-embedding-3-small` or Voyage AI)
- RAG query: embed → vector search → Claude completion
- Sandbox widget
