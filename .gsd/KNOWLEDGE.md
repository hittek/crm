# KNOWLEDGE.md — Project-Specific Rules, Patterns & Lessons

## Prisma migrations

`prisma migrate dev` always fails against the Postgres DB because early migration files
contain SQLite syntax (`AUTOINCREMENT`) that the shadow database rejects (P3006).

**`npx prisma generate` and `npx prisma migrate diff` also fail** — the `npx` wrapper
forces Node 20 which hits an ESM conflict in `@prisma/dev@0.20.0` (`ERR_REQUIRE_ESM`).
`npx prisma db execute` fails the same way.

**Correct workflow for schema changes:**
```bash
# 1. Edit prisma/schema.prisma

# 2. Apply DDL directly via the apply-migration API endpoint
#    (requires superadmin session cookie in /tmp/cookies.txt)
curl -s -b /tmp/cookies.txt -X POST http://localhost:3000/api/internal/apply-migration \
  -H 'Content-Type: application/json' \
  -d '{"sql":"ALTER TABLE \"MyModel\" ADD COLUMN IF NOT EXISTS \"myField\" TEXT"}'

# 3. Regenerate Prisma client — use Node 24 + pnpm binary directly
PRISMA_BIN=$(find node_modules/.pnpm -name "index.js" -path "*/prisma@7.3.0*/build/index.js" | head -1)
~/.nvm/versions/node/v24.14.0/bin/node "$PRISMA_BIN" generate

# 4. Restart dev server to pick up new client
# (bg_shell restart with the crm-dev process id)
```

Never use `npx prisma migrate dev`, `npx prisma migrate deploy`, `npx prisma generate`,
or `npx prisma db execute` on this project — all fail with ERR_REQUIRE_ESM on Node 20.

---

## Pre-push build check

Always run a local build before pushing to avoid Vercel compile failures:

```bash
node_modules/.bin/next build 2>&1 | tail -20
```

Common gotchas:
- Moving a file deeper in the directory tree shifts relative import depths (`../../../` → `../../../../`)
- After restructuring `pages/api/products/[id].js` → `pages/api/products/[id]/index.js`,
  all `../../../lib/*` imports needed one extra `../`

---



Two separate `{!collapsed && (...)}` blocks caused SWC parse error.
Fix: wrap both messages + form in a single fragment `{!collapsed && (<>...</>)}`.

---

## API route boilerplate pattern

All API routes follow this import pattern:

```js
import { getSession } from '../../../lib/auth'           // iron-session wrapper
import prisma from '../../../lib/prisma'                  // default export, not getPrisma
import { checkOrgAccess } from '../../../lib/planLimits' // not lib/orgAccess

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: orgId, role } = session.user   // note: organizationId not orgId

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })
  // ...
}
```



`sellingPrice = costPrice × (1 + feePercent/100) × (1 + marginPercent/100)`

- `costPrice` is nullable — null means service with direct price entry
- Always recompute server-side on create/update in `/api/products`
- UI live-preview uses the same formula in `computePrice()` in `pages/products.js`

---

## Modal pattern

All modals should:
1. Call `useModalClose(onClose)` from `components/ui/Modal.js` (ESC key)
2. Add `onClick={onClose}` on the backdrop div
3. Add `onClick={e => e.stopPropagation()}` on the inner panel div
