---
id: S02
parent: M002
milestone: M002
provides:
  - /signup page: 2-step flow (plan selection → account details) with LFPDPPP consent
  - /api/auth/signup: org+user creation in DB transaction, 14-day trial, session creation
  - /privacidad: privacy notice page (LFPDPPP compliance)
  - /: public landing page (contacts moved to /contacts)
  - Login page "Regístrate gratis" link
requires:
  - slice: S01
    provides: Organization schema with SaaS fields
affects:
  - S03
key_files:
  - pages/signup.js
  - pages/api/auth/signup.js
  - pages/index.js
  - pages/privacidad.js
  - pages/login.js
  - lib/AuthContext.js
  - pages/_app.js
key_decisions:
  - Org slug auto-derived from org name (lowercase, spaces→hyphens, strip specials)
  - planStatus starts as 'trialing' regardless of plan chosen; paid plans redirect to Stripe Checkout after account creation
  - /signup added to PUBLIC_PAGES in both _app.js and AuthContext.js to bypass auth guard
  - 14-day trialEndsAt set at org creation
patterns_established:
  - Signup flow always creates org+user first, then optionally redirects to Stripe for payment
  - PUBLIC_PAGES list is the canonical source for bypassing auth redirects
observability_surfaces:
  - Signup API returns 409 if slug already taken (clear error message to UI)
  - Session created immediately after org+user creation (user lands in CRM on trial)
duration: 1.5h
verification_result: passed
completed_at: 2026-04-30
---

# S02: Self-signup & Onboarding

New users can create an account at `/signup`, pick a plan, accept the privacy notice, and land in a freshly provisioned CRM without any Hittek intervention.

## What Shipped

**`/api/auth/signup` (POST):**
- Generates unique org slug from org name
- Creates Organization + admin User in a Prisma transaction
- Sets `planStatus: 'trialing'`, `trialEndsAt: now + 14 days`
- Creates iron-session and returns user
- Returns 409 on duplicate slug

**`/signup` page:**
- Step 1: Plan selector cards (Prueba gratis / Starter / Pro) with pricing
- Step 2: Org name (with live slug preview), email, password (show/hide), privacy consent checkbox
- Form validation (required fields, email format, password length, consent required)
- On success: if trial → redirect to `/contacts`; if paid plan → redirect to Stripe Checkout

**`/` landing page:** public-facing with CTAs → signup/login
**`/privacidad`:** LFPDPPP privacy notice
**Login page:** "Regístrate gratis" link added

## Test Coverage
Signup flow verified manually via browser. Playwright E2E suite (96/96) covers login flow; dedicated signup spec not added (tested via happy path browser verification).
