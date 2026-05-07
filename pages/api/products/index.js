
import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/planLimits'

function computeSellingPrice(costPrice, feePercent = 0, marginPercent = 0) {
  if (costPrice == null) return null
  return costPrice * (1 + feePercent / 100) * (1 + marginPercent / 100)
}

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })

  
  const { organizationId: orgId, role } = session.user

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  // ── GET /api/products ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { providerId, type, search, activeOnly } = req.query
    const where = {
      orgId,
      ...(providerId && { providerId: parseInt(providerId) }),
      ...(type && { type }),
      ...(activeOnly === '1' && { isActive: true }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { provider: { select: { id: true, name: true } } },
    })
    return res.status(200).json(products)
  }

  // ── POST /api/products ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    const {
      name, description, sku, type = 'service', unit = 'unit',
      providerId, costPrice, feePercent = 0, marginPercent = 0,
      sellingPrice: manualSellingPrice, currency = 'MXN',
    } = req.body

    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })

    const cp = costPrice != null ? parseFloat(costPrice) : null
    const fee = parseFloat(feePercent) || 0
    const margin = parseFloat(marginPercent) || 0
    const derived = computeSellingPrice(cp, fee, margin)
    const sellingPrice = derived ?? parseFloat(manualSellingPrice) ?? 0

    const product = await prisma.product.create({
      data: {
        orgId,
        name: name.trim(),
        description: description || null,
        sku: sku || null,
        type,
        unit,
        providerId: providerId ? parseInt(providerId) : null,
        costPrice: cp,
        feePercent: fee,
        marginPercent: margin,
        sellingPrice,
        currency,
      },
      include: { provider: { select: { id: true, name: true } } },
    })
    return res.status(201).json(product)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método no permitido' })
}
