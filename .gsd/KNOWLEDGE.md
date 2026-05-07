# KNOWLEDGE.md — Project-Specific Rules, Patterns & Lessons

## Prisma migrations

`prisma migrate dev` always fails against the Postgres DB because early migration files
contain SQLite syntax (`AUTOINCREMENT`) that the shadow database rejects (P3006).

**Correct workflow for schema changes:**
```bash
# 1. Edit prisma/schema.prisma
# 2. Generate SQL diff against live DB
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script \
  | grep -v "^Now using\|^Loaded\|^---" > /tmp/migration.sql
# 3. Execute directly (no shadow DB validation)
npx prisma db execute --file /tmp/migration.sql
# 4. Regenerate client
npx prisma generate
# 5. Restart dev server to pick up new client
```

Never use `prisma migrate dev` or `prisma migrate deploy` on this project.

---

## ChatPanel (components/chatbot/ChatPanel.js)

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
