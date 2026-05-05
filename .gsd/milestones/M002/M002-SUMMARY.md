---
milestone: M002
title: SaaS Foundation
provides:
  - Full multi-tenant SaaS layer on the existing CRM
  - Self-signup with 14-day trial and Stripe Checkout for paid plans
  - Stripe billing: Checkout, webhook, Customer Portal, invoice history
  - White-label: logo upload, primary + secondary brand colors (CSS vars), custom domain
  - Trial expiry enforcement: UpgradeWall UI + server-side 402 on POST routes
  - Super-admin panel: org list, suspend/unsuspend, plan override
completed_at: 2026-04-30
test_result: 96/96 passing
---

# M002: SaaS Foundation

Five slices, all shipped. The CRM is now a multi-tenant SaaS product with self-signup, billing, white-label, and admin tooling.

## S01 — Multi-tenant Infrastructure
Schema extended with all SaaS fields (`plan`, `planStatus`, `trialEndsAt`, Stripe IDs, logo, colors, custom domain). Subdomain-aware middleware injects `x-org-slug` / `x-org-host` headers. Plan-limits utility (`PLAN_LIMITS`, `checkPlanLimit`, `checkOrgAccess`) wired into contacts/deals/tasks POST routes. Seed provisions two isolated orgs: `hittek` (enterprise) and `acmemx` (trial).

## S02 — Self-signup & Onboarding
`/signup` 2-step flow: plan selection then account details. `/api/auth/signup` creates org + admin user in a transaction, starts 14-day trial, creates session. Paid plan selection redirects to Stripe Checkout after account creation. Landing page at `/`, contacts moved to `/contacts`, `/privacidad` for LFPDPPP compliance.

## S03 — Stripe Billing
`lib/stripe.js` lazy Proxy singleton. `/api/billing/checkout` creates Checkout sessions. `/api/webhooks/stripe` verifies signatures, activates org on `checkout.session.completed`. `/billing` page: plan cards, trial countdown, upgrade CTA, invoice history table (es-MX formatted), "Gestionar método de pago" (Customer Portal redirect). Requires Stripe Customer Portal activation in Dashboard before production use.

## S04 — White-label & Custom Domains
Logo upload via Vercel Blob (base64 fallback in dev). Primary + secondary brand colors stored on `Organization`; `SettingsContext` generates full CSS var palettes at runtime; Tailwind config maps `primary-*`/`secondary-*` to vars. `UpgradeWall` full-screen component for blocked access. Trial expiry: client-side via `AuthContext.isAccessBlocked` + `_app.js`; server-side via `checkOrgAccess()` lazy-setting `planStatus=suspended`.

## S05 — Super-admin Panel
`lib/superAdmin.js` `requireSuperAdmin` guard. `/api/admin/orgs` GET + PATCH (suspend/unsuspend/plan override). `/admin` org table with status badges, suspend toggles, plan dropdowns.

## Production Checklist (Before Go-Live)

- [ ] **Stripe live credentials** — swap `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` to live-mode values in Vercel env vars
- [ ] **Stripe webhook endpoint** — create endpoint in Stripe Dashboard → Developers → Webhooks pointing to `https://hittek.mx/api/webhooks/stripe` (or the production domain); copy the signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel. `stripe listen` is dev-only.
- [ ] **Stripe Customer Portal** — activate in Stripe Dashboard → Settings → Billing → Customer Portal before the "Gestionar método de pago" button works
- [ ] **Vercel Blob token** — `BLOB_READ_WRITE_TOKEN` must be set in Vercel for logo upload to work in production
- [ ] **SESSION_SECRET** — replace the dev placeholder with a secure 32+ char random string in Vercel env vars

## Remaining Work (M003+)
- AI chatbot (M003 — pgvector RAG on existing PostgreSQL)
- Channel integrations (M004)
- Quote generation (M005)
