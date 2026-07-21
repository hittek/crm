# M002: M002: SaaS Foundation — Roadmap

**Vision:** 

## Slices

- [x] **S01: Multi-tenant Infrastructure** `risk:high` `depends:[]`
  > After this: Schema SaaS fields, subdomain middleware, plan-limits utility, two seeded orgs

- [x] **S02: Self-signup & Onboarding** `risk:high` `depends:[S01]`
  > After this: /signup 2-step flow, /api/auth/signup transaction, 14-day trial, LFPDPPP privacy page, landing page at /

- [x] **S03: Billing — Stripe + Plan Enforcement** `risk:high` `depends:[S02]`
  > After this: Stripe Checkout, webhook activation, /billing page with invoice history + Customer Portal

- [x] **S04: White-label & Custom Domains** `risk:medium` `depends:[S01]`
  > After this: Logo upload (Vercel Blob), primary + secondary brand colors (CSS vars), custom domain field, UpgradeWall, trial expiry enforcement (client + server)

- [x] **S05: Super-admin Panel** `risk:low` `depends:[S02,S03]`
  > After this: /admin org table, suspend/unsuspend, plan override, requireSuperAdmin guard
