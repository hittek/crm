---
id: S04
parent: M002
milestone: M002
provides:
  - Logo upload via Vercel Blob (with base64 fallback in dev)
  - Primary color + secondary color pickers with live preview
  - Custom domain field in settings
  - CSS custom properties (--color-primary-*, --secondary-*) applied at runtime
  - Tailwind secondary-* palette mapped to CSS vars
  - UpgradeWall component for blocked org access
requires:
  - slice: S01
    provides: Organization schema (logo, favicon, primaryColor, secondaryColor, customDomain)
  - slice: S02
    provides: Auth context with org data
affects: []
key_files:
  - pages/api/settings/upload-logo.js
  - pages/api/settings/index.js
  - lib/SettingsContext.js
  - pages/settings.js
  - tailwind.config.js
  - styles/globals.css
  - components/layout/Layout.js
  - components/ui/UpgradeWall.js
  - components/ui/Avatar.js
key_decisions:
  - Vercel Blob for logo storage in production; base64 data URL fallback in dev (no BLOB_READ_WRITE_TOKEN needed locally)
  - Both primary and secondary colors generate full 50/100/500/600/700 shades via adjustColor() from a single hex
  - CSS vars injected at runtime via SettingsContext useEffect — no SSR required
  - UpgradeWall shown by _app.js when isAccessBlocked=true (trial expired, canceled, suspended)
  - Secondary color stored as Organization.secondaryColor with @default('#7c3aed')
patterns_established:
  - adjustColor(hex, lightness) for generating CSS var shades from a single brand hex
  - SettingsContext is the single source of truth for org-level CSS vars
observability_surfaces:
  - none (UI-only feature; failures surface as missing styles)
duration: 2.5h
verification_result: passed
completed_at: 2026-04-30
---

# S04: White-label & Custom Domains

Org admins can upload a logo, configure primary and secondary brand colors, and set a custom domain. Brand colors propagate as CSS custom properties throughout the UI.

## What Shipped

**Logo upload (`/api/settings/upload-logo`):**
- Vercel Blob upload in production (`@vercel/blob`)
- Base64 data URL fallback in dev when `BLOB_READ_WRITE_TOKEN` is absent
- Stored as `Organization.logo`

**Brand Colors:**
- `primaryColor` and `secondaryColor` on Organization (both with DB defaults)
- `SettingsContext`: generates `--color-primary-{50,100,500,600,700}` and `--secondary-{50,100,500,600,700}` CSS vars using `adjustColor()` — applied via `document.documentElement.style.setProperty`
- `tailwind.config.js`: `primary-*` and `secondary-*` palettes mapped to CSS vars
- `globals.css`: `:root` defaults, `.btn-secondary` uses secondary palette, `.sidebar-link-active` has secondary-600 left border accent
- Settings General tab: color pickers with hex inputs and live preview (filled/outlined button samples + color dots)

**Applied to components:**
- Layout sidebar logo monogram: gradient(primary → secondary)
- User avatar ring: secondary palette
- Reports KPI cards: primary / secondary coloring
- Avatar component: `secondary` color variant

**Custom domain:** `Organization.customDomain` field; Settings General tab input; middleware forwards raw `x-org-host` header.

**`UpgradeWall` component:** Full-screen wall shown when org is blocked (trial expired / canceled / suspended). Shows contextual message + plan cards with Stripe Checkout links. Suspended orgs see support contact link instead of upgrade cards.

**Trial expiry enforcement:**
- Client: `AuthContext.isAccessBlocked` computed from `planStatus`/`trialEndsAt`/`suspendedAt`; `_app.js` renders `<UpgradeWall />` when blocked
- Server: `checkOrgAccess(prisma, orgId)` in `lib/planLimits.js`; called in contacts/deals/tasks POST handlers; lazily sets `planStatus=suspended` when trial expires
