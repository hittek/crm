---
milestone: M004
title: Channel Integrations
status: complete
closed: 2026-04-30
---

## Summary

M004 delivered all three channel integrations (Telegram, WhatsApp, Facebook Messenger) plus
encrypted credential storage. Human handoff was already complete from M003 — marked done.

## What Was Shipped

### S01 — Unified Channel Engine + All Three Channels
- `lib/channelEngine.js`: shared non-streaming RAG+Claude engine for all channels
- `lib/crypto.js`: AES-256-GCM encryption for channel credentials
- `ChannelConfig` schema: per-org, per-chatbot, per-channel; credentials encrypted at rest
- Telegram: webhook handler (`/api/webhook/telegram/[apiKey]`), token verify, auto-register webhook
- WhatsApp: webhook handler + Meta verification challenge (`/api/webhook/whatsapp`)
- Facebook: webhook handler + Meta verification challenge (`/api/webhook/facebook`)
- Channel settings UI in chatbots page: connect/disconnect modal per channel

### S04 — Human Agent Handoff (shipped in M003)
- Escalation trigger on escalationPhrase match
- `escalated` conversation status
- CRM notification on escalation
- Agent reply UI in `/conversations` with full event audit trail

## Production Prerequisites
- `ENCRYPTION_KEY`: 64-char hex — set in Vercel env vars
- `NEXT_PUBLIC_APP_URL`: production domain — set in Vercel env vars
- WhatsApp + Facebook: require Meta app review for production use
- Telegram: no review needed — just BotFather token + webhook registration
