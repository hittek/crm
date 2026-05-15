# M004: Channel Integrations

## Vision

Connect each org's chatbot to the messaging channels their customers already use: Facebook Messenger, WhatsApp Business, and Telegram. Incoming messages are routed to the RAG engine; responses flow back through the same channel. Human handoff escalates to a CRM-connected agent.

## Goals

- Facebook Messenger: webhook setup, page token management, send/receive messages
- WhatsApp Business: Cloud API webhooks, phone number verification, template messages
- Telegram: Bot API webhooks, bot token management
- Unified webhook router: all channels dispatch to the same conversation engine
- Human handoff: escalation to human agent visible in CRM conversation view
- Channel status dashboard per org: connected/disconnected, message volume

## Constraints

- Facebook + WhatsApp require Meta developer app review for production (deferred: R029)
- Dev/test: use sandbox/test modes for all three channels
- Org can connect any combination of channels independently
- Token and webhook secrets stored encrypted per org

## Requirements Covered

- R018: Facebook Messenger Integration
- R019: WhatsApp Business Integration
- R020: Telegram Bot Integration
- R025: Human Agent Handoff

## Success Criteria

- Send a message on Telegram test bot → receive RAG answer → escalate → agent sees conversation in CRM
- Facebook and WhatsApp webhook verification passes in dev mode
- Channel connection/disconnection is fully reversible per org
