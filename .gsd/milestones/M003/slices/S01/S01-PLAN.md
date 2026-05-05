# S01: Knowledge Base Management

## Goal
Org admins can create a knowledge base, upload PDFs, paste URLs for scraping, and enter Q&A pairs. Content is extracted and chunked client-ready for vector embedding in S02.

## Tasks

- [ ] **T01: Schema + plan limits** `est:45m`
  - Add `KnowledgeBase`, `KnowledgeBaseDocument`, `KnowledgeBaseChunk` models to schema
  - Update `planLimits.js` with `knowledgeBases`, `kbDocuments` limits
  - Run `prisma generate`

- [ ] **T02: CRUD APIs** `est:1.5h`
  - `GET/POST /api/chatbot/knowledge-bases`
  - `GET/PUT/DELETE /api/chatbot/knowledge-bases/[id]`
  - `POST /api/chatbot/knowledge-bases/[id]/documents` (upload PDF / URL / Q&A)
  - `DELETE /api/chatbot/knowledge-bases/[id]/documents/[docId]`
  - PDF upload → Vercel Blob → text extraction → chunk storage
  - URL scrape → cheerio text extraction → chunk storage
  - Q&A pair → direct chunk storage

- [ ] **T03: Chatbot page UI** `est:2h`
  - `pages/chatbot.js` — KB list + create, document list + upload modal
  - UpgradeWall for trial plan (chatbots=0)
  - Status badges: empty / indexing / chunked / error
  - Add "Chatbot" entry to sidebar nav
  - Add `chatbot` i18n keys (es/en)

## Scope
- S01 stores chunks with `status='chunked'` and no vectors — S02 adds the embedding pipeline and changes status to `indexed`
- No Anthropic/OpenAI keys required in S01
- Vercel Blob used for PDF storage (same as logo uploads)
- PDF text via `pdf-parse`, URL text via `node-fetch` + `cheerio`
