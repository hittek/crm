# M002: SaaS Foundation — Roadmap

## Slices

- [ ] **S01: Multi-tenant Infrastructure** `risk:high` `depends:[]`
  > After this: subdomain routing resolves `[slug].hittek.mx` to the correct org; all API routes scope data to `organizationId` from session; a seed script provisions two isolated orgs for testing

- [ ] **S02: Self-signup & Onboarding** `risk:high` `depends:[S01]`
  > After this: a new user can visit the landing page, fill the signup form (org name, email, password, plan selection), accept the privacy notice, and land in their freshly provisioned CRM — no manual Hittek action required

- [ ] **S03: Billing — Stripe + Plan Enforcement** `risk:high` `depends:[S02]`
  > After this: Stripe Checkout creates a subscription on signup; webhook activates the org; plan limits (contact cap, chatbot seats) are enforced at the API layer; 14-day trial bypasses payment

- [ ] **S04: White-label & Custom Domains** `risk:medium` `depends:[S01]`
  > After this: org admin can upload a logo, pick a primary color, and optionally set a custom CNAME domain — all reflected across the app for that org's users

- [ ] **S05: Super-admin Panel** `risk:low` `depends:[S02,S03]`
  > After this: Hittek super-admins can list all orgs, see plan + billing status, suspend/unsuspend, and manually override plan tier
