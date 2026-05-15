# S03: Billing — Stripe + Plan Enforcement

**Goal:** Stripe Checkout creates a subscription on signup/upgrade; webhook activates the org; plan limits from S01 now have real teeth.

## Tasks

- [ ] **T01: Stripe client singleton** `est:10m`
- [ ] **T02: `/api/billing/checkout` — create Checkout session** `est:20m`
- [ ] **T03: `/api/webhooks/stripe` — handle subscription events** `est:25m`
- [ ] **T04: `/billing` page — current plan, trial info, upgrade CTA** `est:30m`
