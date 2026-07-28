import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: organizationId, role } = session.user

  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  // ── GET /api/quotes ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { dealId, contactId, status, limit = '50' } = req.query
    const where = { organizationId }
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
      taxRate,       // legacy / override; ignored when items carry ivaAmount
      currency = 'MXN',
    } = req.body

    // Sequential quote number scoped to org + year
    const year = new Date().getFullYear()
    const count = await prisma.quote.count({
      where: { organizationId, number: { startsWith: `Q-${year}-` } },
    })
    const number = `Q-${year}-${String(count + 1).padStart(3, '0')}`

    const subtotal = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)

    // Use per-item ivaAmount when available; fall back to legacy taxRate
    const hasPerItemIva = items.some(it => it.ivaAmount !== undefined)
    const tax = hasPerItemIva
      ? parseFloat(items.reduce((s, it) => s + (parseFloat(it.ivaAmount) || 0), 0).toFixed(4))
      : parseFloat((subtotal * (parseFloat(taxRate) || 0)).toFixed(4))
    const blendedRate = subtotal > 0 ? tax / subtotal : (parseFloat(taxRate) || 0)
    const total = parseFloat((subtotal + tax).toFixed(4))

    const quote = await prisma.quote.create({
      data: {
        organizationId,
        number,
        status: 'draft',
        dealId: dealId ? parseInt(dealId) : null,
        contactId: contactId ? parseInt(contactId) : null,
        items: JSON.stringify(items),
        subtotal,
        taxRate: blendedRate,
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
