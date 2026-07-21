---
id: S03
parent: M002
milestone: M002
provides:
  - Stripe Checkout session creation for starter/pro plans
  - Stripe webhook handler (checkout.session.completed, customer.subscription.*)
  - /billing page: plan cards, upgrade CTA, invoice history, payment method portal
  - /api/billing/checkout, /api/billing/invoices, /api/billing/portal endpoints
  - lib/stripe.js: lazy Proxy singleton (safe in Edge/CI environments)
requires:
  - slice: S01
    provides: Organization schema with Stripe fields
  - slice: S02
    provides: Signup flow that redirects to Checkout
affects:
  - S05
key_files:
  - lib/stripe.js
  - pages/api/billing/checkout.js
  - pages/api/billing/invoices.js
  - pages/api/billing/portal.js
  - pages/api/webhooks/stripe.js
  - pages/billing.js
key_decisions:
  - Stripe SDK instantiated via lazy Proxy (first property access) — prevents CI/client crashes when STRIPE_SECRET_KEY absent
  - Webhook raw body collected via native getRawBody() helper (no `micro` dependency)
  - Payment method management via Stripe Customer Portal (PCI-safe, zero custom card UI)
  - Invoice history fetches last 24 invoices from Stripe API; returns [] if no Stripe customer
patterns_established:
  - lib/stripe.js Proxy pattern for any SDK that must not init at import time
  - Billing routes require admin role; portal returns friendly error if not configured in Dashboard
observability_surfaces:
  - Webhook route logs event.type for every received event
  - /billing?success=1 and /billing?canceled=1 handled with inline banners
  - Portal endpoint surfaces 'portal_not_configured' error code when Stripe Dashboard setup missing
duration: 2h
verification_result: passed
completed_at: 2026-04-30
---

# S03: Billing — Stripe + Plan Enforcement

Stripe Checkout creates subscriptions for paid plans; a webhook activates the org; a billing tab shows current plan, invoice history, and links to the Customer Portal for payment management.

## What Shipped

**`lib/stripe.js`:** Lazy Proxy — Stripe SDK only instantiates on first property access. Safe for Edge runtime and CI where `STRIPE_SECRET_KEY` is absent.

**`/api/billing/checkout` (POST):**
- Admin-only; creates Stripe Checkout session for starter/pro
- Creates Stripe Customer if org has none, stores `stripeCustomerId`
- `success_url` → `/billing?success=1`, `cancel_url` → `/billing?canceled=1`

**`/api/webhooks/stripe` (POST):**
- Raw body via `getRawBody()` (native, no external dep)
- Verifies Stripe-Signature when `STRIPE_WEBHOOK_SECRET` is set (dev fallback: raw JSON parse)
- Handles: `checkout.session.completed` (sets planStatus active), `customer.subscription.updated/deleted`

**`/api/billing/invoices` (GET):** Returns last 24 Stripe invoices (date, amount, currency, status, PDF URL); `[]` if no Stripe customer.

**`/api/billing/portal` (POST):** Creates Customer Portal session; admin-only; returns `portal_not_configured` error if portal not activated in Stripe Dashboard.

**`/billing` page:** Plan cards with current plan highlighted; trial countdown; upgrade button (Checkout redirect); Invoice History table (es-MX formatted amounts, status badges, PDF download); "Gestionar método de pago" (Portal); loading states for all three data fetches.

## Env Vars Required
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`
- `STRIPE_WEBHOOK_SECRET` (optional in dev — raw JSON fallback active)

## Note
Stripe Customer Portal must be activated in Stripe Dashboard → Settings → Billing → Customer Portal before the portal button works in production.
