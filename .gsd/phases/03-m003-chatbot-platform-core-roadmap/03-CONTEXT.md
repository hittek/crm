# M003: Chatbot Platform Core

## Vision

Give each org the ability to build an AI-powered chatbot backed by their own knowledge base. Org admins upload documents (PDFs, URLs, Q&A pairs), the system indexes them into pgvector, and the chatbot answers questions using RAG + Anthropic Claude. Conversations are visible inside the CRM.

## Goals

- Knowledge base management UI: upload docs, scrape URLs, enter Q&A pairs
- RAG engine: chunk → embed → pgvector store → retrieval → Claude completion
- Chatbot config UI per org: name, avatar, greeting, escalation settings
- Conversation management: view all chatbot conversations, filter by channel/status
- API cost metering: track Anthropic token usage per org against plan limits
- Sandbox mode: org admin can test their chatbot before going live

## Constraints

- pgvector on existing PostgreSQL (no new infra yet)
- Anthropic Claude API — Claude 3 Haiku for cost efficiency on Starter plans
- Embeddings: OpenAI text-embedding-3-small or Voyage AI (evaluate during planning)
- No live channel connections yet (those are M004)

## Requirements Covered

- R012: Knowledge Base Management
- R013: AI Chatbot Engine (RAG + Anthropic + pgvector)
- R014: Chatbot Configuration UI per Org
- R015: Conversation Management UI
- R016: Anthropic API Cost Metering per Org
- R017: Chatbot Sandbox / Testing Mode

## Success Criteria

- Org admin uploads a PDF, waits for indexing, asks a question in sandbox, gets a grounded answer
- Cost metering shows token usage per org in super-admin panel
- Chatbot config (name, avatar, greeting) renders correctly in sandbox preview
- Plan limit on knowledge base size is enforced at upload
