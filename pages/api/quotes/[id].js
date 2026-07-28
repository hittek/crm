import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: organizationId, role } = session.user
  const { id } = req.query

  const quote = await prisma.quote.findFirst({
    where: { id: parseInt(id), organizationId },
  })
  if (!quote) return res.status(404).json({ error: 'Cotización no encontrada' })

  // ── GET /api/quotes/[id] ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json({ ...quote, items: JSON.parse(quote.items || '[]') })
  }

  // ── PATCH /api/quotes/[id] ───────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { status, items, notes, validUntil, taxRate, currency } = req.body
    const data = {}

    if (status !== undefined) data.status = status
    if (notes !== undefined) data.notes = notes?.trim() || null
    if (validUntil !== undefined) data.validUntil = validUntil ? new Date(validUntil) : null
    if (currency !== undefined) data.currency = currency

    if (items !== undefined) {
      const subtotal = items.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
      const hasPerItemIva = items.some(it => it.ivaAmount !== undefined)
      const tax = hasPerItemIva
        ? parseFloat(items.reduce((s, it) => s + (parseFloat(it.ivaAmount) || 0), 0).toFixed(4))
        : parseFloat((subtotal * (taxRate !== undefined ? parseFloat(taxRate) : quote.taxRate)).toFixed(4))
      const blendedRate = subtotal > 0 ? tax / subtotal : quote.taxRate
      data.items = JSON.stringify(items)
      data.subtotal = subtotal
      data.taxRate = blendedRate
      data.tax = tax
      data.total = parseFloat((subtotal + tax).toFixed(4))
    } else if (taxRate !== undefined) {
      // Legacy: taxRate-only change — recalculate on existing items
      const rate = parseFloat(taxRate)
      const existingItems = JSON.parse(quote.items || '[]')
      const subtotal = existingItems.reduce((s, it) => s + (parseFloat(it.total) || 0), 0)
      data.taxRate = rate
      data.tax = parseFloat((subtotal * rate).toFixed(4))
      data.total = parseFloat((subtotal + data.tax).toFixed(4))
    }

    const updated = await prisma.quote.update({
      where: { id: parseInt(id) },
      data,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal: { select: { id: true, title: true } },
      },
    })

    return res.status(200).json({ ...updated, items: JSON.parse(updated.items || '[]') })
  }

  // ── DELETE /api/quotes/[id] ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    await prisma.quote.delete({ where: { id: parseInt(id) } })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Método no permitido' })
}
