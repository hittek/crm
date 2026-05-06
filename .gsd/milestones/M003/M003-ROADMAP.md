# M003: Chatbot Platform Core — Roadmap

## Slices

- [x] **S01: Knowledge Base Management** `risk:high` `depends:[]`
  > After this: org admin can create a knowledge base, upload PDFs, paste URLs for scraping, and enter manual Q&A pairs — all chunked, embedded, and stored in pgvector

- [x] **S02: RAG Engine & Claude Integration** `risk:high` `depends:[S01]`
  > After this: a query against the knowledge base retrieves relevant chunks, assembles a prompt, and returns a grounded Claude-generated answer — latency and token cost logged per request

- [ ] **S03: Chatbot Config UI & Sandbox** `risk:medium` `depends:[S02]`
  > After this: org admin configures chatbot name, avatar, greeting message, and escalation trigger; sandbox widget lets them test the chatbot live in-browser before connecting a channel

- [ ] **S04: Conversation Management UI** `risk:low` `depends:[S02]`
  > After this: all chatbot conversations are listed in the CRM with channel, status (open/resolved/escalated), contact link, and full message history viewable inline
