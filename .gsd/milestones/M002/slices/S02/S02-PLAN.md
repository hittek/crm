# S02: Self-signup & Onboarding

**Goal:** Any user can visit /signup, fill out org name + email + password, pick a plan, accept the privacy notice (LFPDPPP), and land in a freshly provisioned CRM — no Hittek intervention.

**Demo:** Navigate to /signup on a clean browser → fill form → submit → land at / in the CRM as the first admin of a new org on a 14-day trial.

## Tasks

- [ ] **T01: `/api/auth/signup` endpoint** `est:25m`
  - Create Organization (slug auto-derived from name), create admin User, start 14-day trial, create session
- [ ] **T02: `/signup` page** `est:40m`
  - Org name (slug preview), email, password, plan selector (trial/starter/pro), privacy consent checkbox, submit
- [ ] **T03: Login page — link to signup** `est:10m`
