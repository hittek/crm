# M006: CRM ↔ Chatbot Bridge

## Vision

Close the loop between chatbot conversations and the CRM. Every relevant chatbot event — new lead identified, quote generated, conversation escalated — creates or updates records in the CRM automatically. Human agents have full context without switching apps.

## Goals

- Chatbot-generated quotes automatically saved as Quote records in CRM
- Chatbot conversations logged as Activities on the linked Contact
- New prospects identified in conversation → Contact + Deal auto-created in CRM
- Human handoff: agent sees conversation history inline in CRM (not a separate tool)
- Lead scoring signal from conversation (engaged/unengaged) updates Contact in CRM

## Constraints

- Contact deduplication: match by phone number or email from conversation metadata
- Activity logging must not block message response latency (async queue)
- Agent handoff UI built into CRM conversation view (no separate inbox app)

## Requirements Covered

- R023: Chatbot-to-CRM Quote & Activity Logging
- R024: Lead Auto-creation from Chatbot
- R025: Human Agent Handoff (CRM side)

## Success Criteria

- Chatbot conversation on Telegram → Contact auto-created in CRM with conversation attached as Activity
- Quote generated in chatbot → appears in CRM under correct Deal within 5 seconds
- Agent opens CRM conversation view, sees full message history, replies — message delivered on original channel
