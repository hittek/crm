# M002: SaaS Foundation

## Vision

Transform the single-tenant CRM into a self-serve SaaS platform. Any small business in Mexico can discover Hittek, sign up, choose a plan, pay, and have a fully provisioned white-label CRM running at their subdomain — without any manual intervention from Hittek.

## Goals

- Self-serve signup and org provisioning in one flow
- Stripe subscription billing (test mode for dev) with Conekta evaluated for OXXO/SPEI
- Tiered plans (Starter / Pro / Enterprise) enforced at the API layer
- White-label: org logo, primary color, custom domain (CNAME) optional
- Super-admin panel for Hittek to see all orgs, plans, and billing state
- Subdomain routing: `[slug].hittek.mx` → org-scoped app

## Constraints

- No production deployment yet — local demo target with Stripe test mode
- Organization model already exists in schema; build on top of it
- LFPDPPP privacy compliance (Mexico data protection law) — privacy notice + consent checkbox on signup
- Free trial period (14 days) before billing activates

## Requirements Covered

- R003: Multi-tenant SaaS Architecture
- R004: Self-signup Landing Page & Onboarding
- R005: Tiered Subscription Plans (API-enforced)
- R006: Payment Integration (Stripe + Conekta)
- R007: White-label Customization
- R008: Super-admin Panel for Hittek
- R009: Subdomain Routing
- R010: Free Trial Period
- R011: LFPDPPP Privacy Compliance

## Success Criteria

- New org can sign up, choose Starter plan, enter test card, and land in their provisioned CRM in under 3 minutes
- Plan limits (e.g. contact cap) are blocked at the API, not just hidden in the UI
- Subdomain routing resolves correct org from request host header
- Super-admin can view all orgs, suspend, and change plan
- Playwright suite stays green
