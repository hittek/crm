# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — CRM Core Flows Validated
- Class: quality-attribute
- Status: active
- Description: All existing CRM flows (contacts, deals, tasks, pipeline, settings, reports) proven working via automated tests
- Why it matters: The CRM is the foundation everything else is sold on — broken interactions undermine trust
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M001/S02, M001/S03, M001/S04, M001/S05
- Validation: unmapped
- Notes: Covers discovery of broken interactions as well as the fix

### R002 — UI Interaction Bug Fixes
- Class: quality-attribute
- Status: active
- Description: All discovered broken buttons, form submissions, modal actions, and drag-drop interactions are fixed
- Why it matters: Known broken UI erodes client confidence immediately during demo
- Source: user
- Primary owning slice: M001/S02
- Supporting slices: M001/S03, M001/S04, M001/S05
- Validation: unmapped
- Notes: Scope includes fix, not just documentation of issues

### R003 — Multi-tenant SaaS Architecture
- Class: core-capability
- Status: active
- Description: Platform supports multiple organizations in full isolation — data, config, and branding per org
- Why it matters: Core enabling requirement for SaaS model; without it nothing else in M002+ can ship
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Organization model with organizationId isolation already exists in schema

### R004 — Self-signup Landing Page & Onboarding
- Class: primary-user-loop
- Status: active
- Description: Prospective clients can sign up, choose a plan, pay, and access their provisioned CRM without Hittek intervention
- Why it matters: SaaS revenue depends on self-serve acquisition; manual onboarding doesn't scale
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S03
- Validation: unmapped
- Notes: Local demo target — Stripe test mode, no production deployment required for M002

### R005 — Tiered Subscription Plans (API-enforced)
- Class: core-capability
- Status: active
- Description: Starter/Pro/Enterprise plans with feature limits enforced at the API layer, not just the UI
- Why it matters: Plan limits bypassed at UI-only level create support liability and revenue leakage
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: M002/S04
- Validation: unmapped
- Notes: Feature gating enforced server-side per request; tiers and limits defined during M002 planning

### R006 — Payment Integration (Stripe + Conekta)
- Class: integration
- Status: active
- Description: Stripe handles subscription billing; Conekta evaluated as fallback for OXXO/SPEI payment methods
- Why it matters: Mexican small businesses often pay via OXXO or bank transfer — card-only cuts off a segment
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Stripe primary for subscription management API quality; Conekta decision made during M002 architecture

### R007 — White-label Customization
- Class: differentiator
- Status: active
- Description: Each org can set logo, primary color, name, and custom domain (CNAME to crm.[client].com)
- Why it matters: Clients want to present the CRM under their own brand, not Hittek's
- Source: user
- Primary owning slice: M002/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Organization model already has logo, favicon, primaryColor fields — needs management UI and domain routing

### R008 — Super-admin Panel for Hittek
- Class: operability
- Status: active
- Description: Hittek staff can view, manage, suspend, and inspect all tenant organizations from a single admin interface
- Why it matters: Without visibility into all tenants, support and billing issues can't be resolved
- Source: inferred
- Primary owning slice: M002/S05
- Supporting slices: none
- Validation: unmapped
- Notes: Separate auth scope from regular org admin; accessible only to Hittek internal users

### R009 — Subdomain Routing (*.hittek.mx + optional CNAME)
- Class: core-capability
- Status: active
- Description: Each tenant gets [client].hittek.mx by default; optionally maps crm.[client].com via CNAME
- Why it matters: Subdomain routing is the multi-tenant URL strategy; required for white-label to work end-to-end
- Source: user
- Primary owning slice: M002/S04
- Supporting slices: none
- Validation: unmapped
- Notes: GoDaddy wildcard DNS (*.hittek.mx) → AWS deployment; CNAME mapping documented for clients

### R010 — Free Trial Period for New Signups
- Class: primary-user-loop
- Status: active
- Description: New signups get a free trial period before payment is required
- Why it matters: Standard SaaS acquisition pattern — requiring payment upfront kills conversion for small businesses
- Source: research
- Primary owning slice: M002/S02
- Supporting slices: M002/S03
- Validation: unmapped
- Notes: Trial duration and credit card requirement to be decided during M002 planning

### R011 — LFPDPPP Privacy Compliance
- Class: compliance/security
- Status: active
- Description: Platform includes privacy policy, data processing consent at signup, and data handling aligned with Mexico's federal data privacy law
- Why it matters: Legal requirement for any SaaS handling personal data in Mexico; non-compliance creates liability
- Source: research
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Primarily a consent checkbox + privacy policy at signup; not a full GDPR audit

### R012 — Knowledge Base Management
- Class: core-capability
- Status: active
- Description: Org admins can upload documents, FAQs, and product info; content is processed into vector embeddings for chatbot retrieval
- Why it matters: The chatbot's accuracy depends entirely on the quality of the knowledge base it draws from
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S02
- Validation: unmapped
- Notes: pgvector on existing PostgreSQL; embeddings generated via Anthropic or OpenAI embeddings API

### R013 — AI Chatbot Engine (RAG + Anthropic + pgvector)
- Class: core-capability
- Status: active
- Description: Chatbot retrieves relevant knowledge base content (RAG) and generates responses via Anthropic Claude API
- Why it matters: Core value prop of the chatbot product — answers grounded in the client's actual business content
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M003/S03
- Validation: unmapped
- Notes: Per-org knowledge base isolation; Anthropic model tier decided during M003 planning

### R014 — Chatbot Configuration UI per Org
- Class: primary-user-loop
- Status: active
- Description: Org admins configure chatbot name, avatar, welcome message, fallback behavior, and knowledge base assignment
- Why it matters: Clients need control over how their chatbot presents itself to customers
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Multiple chatbots per org subject to plan tier limits

### R015 — Conversation Management UI
- Class: primary-user-loop
- Status: active
- Description: Org users can view chatbot conversation history, search conversations, and see per-contact chat threads
- Why it matters: Without visibility into chatbot conversations, clients can't improve or audit the chatbot's behavior
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: M006/S01
- Validation: unmapped

### R016 — Anthropic API Cost Metering per Org
- Class: operability
- Status: active
- Description: Track Anthropic API token usage per organization; enforce limits based on plan tier; surface usage in super-admin
- Why it matters: Unbounded API usage from a single heavy org could make the platform unprofitable
- Source: research
- Primary owning slice: M003/S02
- Supporting slices: M002/S03
- Validation: unmapped
- Notes: Metering stored in DB; alerts when approaching plan limit

### R017 — Chatbot Sandbox / Testing Mode
- Class: quality-attribute
- Status: active
- Description: Clients can test their chatbot (send messages, see responses) in a sandboxed UI before deploying to live channels
- Why it matters: Prevents broken or poorly configured bots from reaching real customers
- Source: research
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped

### R018 — Facebook Messenger Integration
- Class: integration
- Status: active
- Description: Chatbot responds to Facebook Messenger messages via Meta Webhooks
- Why it matters: Messenger is a primary customer communication channel for small businesses in Mexico
- Source: user
- Primary owning slice: M004/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Sandbox/test credentials for local demo; Meta production approval deferred

### R019 — WhatsApp Business Integration
- Class: integration
- Status: active
- Description: Chatbot responds to WhatsApp messages via WhatsApp Business API; Hittek provisions accounts for clients
- Why it matters: WhatsApp is the dominant messaging platform in Mexico
- Source: user
- Primary owning slice: M004/S02
- Supporting slices: none
- Validation: unmapped
- Notes: BSP (Twilio or 360dialog) evaluated during M004 planning; provisioning model TBD

### R020 — Telegram Bot Integration
- Class: integration
- Status: active
- Description: Chatbot responds to Telegram messages via Telegram Bot API webhooks
- Why it matters: Telegram has strong adoption among tech-savvy SMB segment in Mexico
- Source: user
- Primary owning slice: M004/S03
- Supporting slices: none
- Validation: unmapped

### R021 — CRM Quote Builder
- Class: core-capability
- Status: active
- Description: Sales reps can create quotes from a Deal (line items, pricing, discounts), generate a PDF, and send to contacts
- Why it matters: Quoting is a core sales workflow — without it, the CRM doesn't support the full sales cycle
- Source: user
- Primary owning slice: M005/S01
- Supporting slices: M005/S02
- Validation: unmapped
- Notes: Quote status tracking (draft, sent, viewed, accepted, rejected)

### R022 — Chatbot Quote Generation
- Class: core-capability
- Status: active
- Description: Chatbot can generate price quotes mid-conversation based on knowledge base pricing data
- Why it matters: Automates a high-value sales interaction without requiring a human agent
- Source: user
- Primary owning slice: M005/S02
- Supporting slices: M006/S01
- Validation: unmapped
- Notes: Quotes generated by chatbot must be registered in the CRM (R023)

### R023 — Chatbot-to-CRM Quote & Activity Logging
- Class: integration
- Status: active
- Description: Quotes generated by chatbot are saved as Quote records in CRM; conversations logged as Activities on the contact
- Why it matters: Without CRM logging, chatbot interactions are invisible to the sales team
- Source: user
- Primary owning slice: M006/S01
- Supporting slices: M006/S02
- Validation: unmapped

### R024 — Lead Auto-creation from Chatbot
- Class: primary-user-loop
- Status: active
- Description: When a chatbot conversation identifies a new prospect, a Contact and Deal are automatically created in the CRM
- Why it matters: Closes the loop between chatbot acquisition and CRM pipeline
- Source: user
- Primary owning slice: M006/S02
- Supporting slices: none
- Validation: unmapped

### R025 — Human Agent Handoff
- Class: continuity
- Status: active
- Description: Chatbot can escalate a conversation to a human agent; agent sees full conversation history in CRM
- Why it matters: Complex or sensitive conversations require human intervention — without handoff, the chatbot creates dead ends
- Source: inferred
- Primary owning slice: M006/S03
- Supporting slices: M003/S04
- Validation: unmapped

### R030 — Responsive / Mobile-ready Web App
- Class: quality-attribute
- Status: active
- Description: All web UI works correctly on mobile browsers (375px) and tablets (768px) — no native app required
- Why it matters: Small business owners manage their CRM from phones; a desktop-only UI loses most of the market
- Source: user
- Primary owning slice: M001/S01
- Supporting slices: M002/S04, M003/S03, M005/S01, M006/S01
- Validation: unmapped
- Notes: Verified at 375px (iPhone SE) and 768px (iPad) breakpoints in Playwright

## Deferred

### R026 — Email Campaigns
- Class: primary-user-loop
- Status: deferred
- Description: Org users can create, schedule, and send email campaigns to contact segments
- Why it matters: Email is a high-ROI channel for SMB marketing
- Source: user
- Primary owning slice: M007
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — full product vision, not needed for initial launch

### R027 — Native Calendar Integration
- Class: integration
- Status: deferred
- Description: CRM tasks and meetings sync with Google Calendar / Outlook
- Why it matters: Sales teams live in their calendar — CRM tasks without calendar sync create duplication
- Source: user
- Primary owning slice: M008
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — not blocking initial launch

### R028 — Production AWS Deployment
- Class: operability
- Status: deferred
- Description: Full production deployment to AWS with proper topology, scaling, and monitoring
- Why it matters: Required before commercial launch
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Topology (ECS/EC2/Lambda) requires cost analysis; deferred until after local demo validation

### R029 — Meta Production Approvals (WhatsApp/Messenger)
- Class: integration
- Status: deferred
- Description: WhatsApp Business API and Facebook Messenger production approval from Meta
- Why it matters: Required before going live with real customers
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Sandbox credentials used for local demo; production approvals are a business process, not a code task

## Out of Scope

### R031 — Native Mobile App
- Class: anti-feature
- Status: out-of-scope
- Description: No native iOS or Android app will be built
- Why it matters: Prevents scope confusion — mobile needs are met by responsive web
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: R030 (responsive web) is the mobile strategy

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|----|-------|--------|---------------|------------|-------|
| R001 | quality-attribute | active | M001/S01 | M001/S02–S05 | unmapped |
| R002 | quality-attribute | active | M001/S02 | M001/S03–S05 | unmapped |
| R003 | core-capability | active | M002/S01 | none | unmapped |
| R004 | primary-user-loop | active | M002/S02 | M002/S03 | unmapped |
| R005 | core-capability | active | M002/S03 | M002/S04 | unmapped |
| R006 | integration | active | M002/S03 | none | unmapped |
| R007 | differentiator | active | M002/S04 | none | unmapped |
| R008 | operability | active | M002/S05 | none | unmapped |
| R009 | core-capability | active | M002/S04 | none | unmapped |
| R010 | primary-user-loop | active | M002/S02 | M002/S03 | unmapped |
| R011 | compliance/security | active | M002/S02 | none | unmapped |
| R012 | core-capability | active | M003/S01 | M003/S02 | unmapped |
| R013 | core-capability | active | M003/S02 | M003/S03 | unmapped |
| R014 | primary-user-loop | active | M003/S03 | none | unmapped |
| R015 | primary-user-loop | active | M003/S04 | M006/S01 | unmapped |
| R016 | operability | active | M003/S02 | M002/S03 | unmapped |
| R017 | quality-attribute | active | M003/S03 | none | unmapped |
| R018 | integration | active | M004/S01 | none | unmapped |
| R019 | integration | active | M004/S02 | none | unmapped |
| R020 | integration | active | M004/S03 | none | unmapped |
| R021 | core-capability | active | M005/S01 | M005/S02 | unmapped |
| R022 | core-capability | active | M005/S02 | M006/S01 | unmapped |
| R023 | integration | active | M006/S01 | M006/S02 | unmapped |
| R024 | primary-user-loop | active | M006/S02 | none | unmapped |
| R025 | continuity | active | M006/S03 | M003/S04 | unmapped |
| R026 | primary-user-loop | deferred | M007 | none | unmapped |
| R027 | integration | deferred | M008 | none | unmapped |
| R028 | operability | deferred | none | none | unmapped |
| R029 | integration | deferred | none | none | unmapped |
| R030 | quality-attribute | active | M001/S01 | M002/S04, M003/S03, M005/S01, M006/S01 | unmapped |
| R031 | anti-feature | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 26
- Mapped to slices: 26
- Validated: 0
- Unmapped active requirements: 0
