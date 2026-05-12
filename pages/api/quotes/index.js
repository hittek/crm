import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: orgId, role } = session.user

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  // ── GET /api/quotes ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { dealId, contactId, status, limit = '50' } = req.query
    const where = { orgId }
    if (dealId) where.dealId = parseInt(dealId)
    if (contactId) where.contactId = parseInt(contactId)
    if (status) where.status = status

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    })

    return res.status(200).json(
      quotes.map(q => ({ ...q, items: JSON.parse(q.items || '[]') }))
    )
  }

  // ── POST /api/quotes ────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (role !== 'admin' && role !== 'manager' && role !== 'agent') {
      return res.status(403).json({ error: 'Sin permisos' })
    }

    const {
      dealId,
      contactId,
      items = [],
      notes,
      validUntil,
      taxRate = 0.16,
      currency = 'MXN',
    } = req.body

    // Sequential quote number scoped to org + year
    const year = new Date().getFullYear()
    const count = await prisma.quote.count({
      where: { orgId, number: { startsWith: `Q-${year}-` } },
    })
    const number = `Q-${year}-${String(count + 1).padStart(3, '0')}`

    const rate = parseFloat(taxRate) || 0
    const subtotal = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
    const tax = parseFloat((subtotal * rate).toFixed(4))
    const total = parseFloat((subtotal + tax).toFixed(4))

    const quote = await prisma.quote.create({
      data: {
        orgId,
        number,
        status: 'draft',
        dealId: dealId ? parseInt(dealId) : null,
        contactId: contactId ? parseInt(contactId) : null,
        items: JSON.stringify(items),
        subtotal,
        taxRate: rate,
        tax,
        total,
        currency: currency || 'MXN',
        notes: notes?.trim() || null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    })

    return res.status(201).json({ ...quote, items: JSON.parse(quote.items) })
  }

  return res.status(405).json({ error: 'Método no permitido' })
}
