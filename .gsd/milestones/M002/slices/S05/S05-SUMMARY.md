---
id: S05
parent: M002
milestone: M002
provides:
  - /admin page: org table with suspend/unsuspend + plan override
  - /api/admin/orgs: list all orgs + PATCH suspend/planOverride
  - lib/superAdmin.js: isSuperAdmin guard
requires:
  - slice: S02
    provides: User.isSuperAdmin field in schema
  - slice: S03
    provides: Stripe billing status on orgs
affects: []
key_files:
  - lib/superAdmin.js
  - pages/api/admin/orgs.js
  - pages/admin.js
key_decisions:
  - Super-admin flag on User.isSuperAdmin (not a separate role string) — avoids polluting RBAC role hierarchy
  - /admin accessible only to users with isSuperAdmin=true; regular admin role is insufficient
  - Suspend sets Organization.suspendedAt; unsuspend clears it and sets planStatus=active
patterns_established:
  - requireSuperAdmin(handler) wrapper in lib/superAdmin.js for API routes
observability_surfaces:
  - /admin table shows planStatus, suspendedAt, trialEndsAt, Stripe IDs at a glance
duration: 1h
verification_result: passed
completed_at: 2026-04-30
---

# S05: Super-admin Panel

Super-admins can list all orgs, view plan/billing status, suspend or unsuspend orgs, and override plan tiers — all from `/admin`.

## What Shipped

**`lib/superAdmin.js`:**
- `requireSuperAdmin(handler)` — API middleware that checks `session.user.isSuperAdmin`; returns 403 if not set

**`/api/admin/orgs`:**
- `GET`: returns all orgs with id, name, slug, plan, planStatus, stripeCustomerId, trialEndsAt, suspendedAt, user count
- `PATCH /:id/suspend`: sets `suspendedAt = now`, `planStatus = suspended`
- `PATCH /:id/unsuspend`: clears `suspendedAt`, sets `planStatus = active`
- `PATCH /:id/plan`: overrides `plan` field (for manual tier changes)

**`/admin` page:**
- Table of all orgs with columns: name, slug, plan badge, status badge, trial end, Stripe customer ID, user count
- Suspend/unsuspend toggle button per org
- Plan override dropdown per org
- Super-admin nav link visible only when `user.isSuperAdmin`
