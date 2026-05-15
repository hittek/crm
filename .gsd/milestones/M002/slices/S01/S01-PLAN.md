# S01: Multi-tenant Infrastructure

**Goal:** Add the SaaS layer to the schema, add Next.js subdomain routing middleware, build a plan-limits utility wired into API routes, and seed two isolated orgs for testing.

**Demo:** After this: `acmemx.localhost:3000` routes to the acmemx org; `hittek.localhost:3000` routes to the hittek org; logging in on the wrong subdomain is blocked; creating a 51st contact on a trial-plan org returns 403 with a clear plan-limit error.

## Tasks

- [ ] **T01: Schema migration — SaaS fields** `est:20m`
- [ ] **T02: Next.js middleware — subdomain routing** `est:30m`
- [ ] **T03: Plan limits utility + API enforcement** `est:30m`
- [ ] **T04: Seed two isolated orgs** `est:20m`
