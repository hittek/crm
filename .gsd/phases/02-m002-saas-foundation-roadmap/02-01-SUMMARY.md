---
id: S01
parent: M002
milestone: M002
provides:
  - Multi-tenant schema with SaaS fields on Organization and isSuperAdmin on User
  - Subdomain-aware middleware injecting x-org-slug / x-org-host headers
  - Plan-limits utility (PLAN_LIMITS tiers, checkPlanLimit, planLimitResponse)
  - Seeded hittek (enterprise) and acmemx (trial) orgs
requires: []
affects:
  - S02
  - S03
  - S04
  - S05
key_files:
  - prisma/schema.prisma
  - middleware.js
  - lib/planLimits.js
  - prisma/seed.js
  - pages/api/contacts/index.js
  - pages/api/deals/index.js
  - pages/api/tasks/index.js
key_decisions:
  - iron-session carries organizationId; middleware reads Host header for subdomain context
  - planLimits keyed by plan string (trial/starter/pro/enterprise); -1 = unlimited
  - Per-org overrides stored as JSON in Organization.planLimits
patterns_established:
  - checkPlanLimit(prisma, organizationId, entity) returns { allowed, limit, current, plan }
  - planLimitResponse(res, result) sends 403 with human-readable error
observability_surfaces:
  - API returns 403 with upgradeRequired:true when plan limit hit
  - x-org-slug and x-org-host headers visible in all API requests for routing tracing
duration: 2h
verification_result: passed
completed_at: 2026-04-30
---

# S01: Multi-tenant Infrastructure

SaaS fields added to schema and pushed to DB, subdomain middleware deployed, plan-limits utility wired into contacts/deals/tasks POST routes, and seed provisions two isolated orgs.

## What Shipped

**Schema (`prisma/schema.prisma`):**
- `Organization`: added `plan`, `planStatus`, `trialEndsAt`, `stripeCustomerId`, `stripeSubscriptionId`, `primaryColor`, `secondaryColor`, `customDomain`, `logo`, `favicon`, `orgSettings`, `planLimits`, `suspendedAt`
- `User`: added `isSuperAdmin`

**Middleware (`middleware.js`):**
- Extracts org slug from Host (e.g. `hittek.hittek.mx` → `hittek`; `localhost:3000` → no slug)
- Injects `x-org-slug` and `x-org-host` request headers for downstream API use
- Passes through unchanged — no hard block at edge (DB not accessible in Edge runtime)

**Plan Limits (`lib/planLimits.js`):**
- `PLAN_LIMITS` tiers: trial (50/50/100), starter (500/500/2000), pro (5000/5000/20000), enterprise (unlimited)
- `checkPlanLimit(prisma, orgId, entity)` — counts existing records, checks against limit
- `planLimitResponse(res, result)` — 403 with detail
- `checkOrgAccess(prisma, orgId)` — checks trial expiry / suspended status; lazily sets `planStatus=suspended` when trial expires

**Seed (`prisma/seed.js`):**
- `hittek` org (enterprise plan) with admin/manager/user accounts
- `acmemx` org (trial plan) for isolation testing

## Test Coverage
Manual verification via `npx playwright test` (96/96 passing); plan limit paths covered by API-level checks, not separate spec.
