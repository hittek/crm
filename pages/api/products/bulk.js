import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/planLimits'

function computeSellingPrice(costPrice, feePercent = 0, marginPercent = 0) {
  if (costPrice == null) return null
  return costPrice * (1 + feePercent / 100) * (1 + marginPercent / 100)
}

const ALLOWED_FIELDS = ['feePercent', 'marginPercent', 'currency', 'isActive']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const session = await getSession(req, res)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId: orgId, role } = session.user
  if (role !== 'admin' && role !== 'manager') {
    return res.status(403).json({ error: 'Sin permiso' })
  }

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const { ids, patch } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids requerido' })
  }
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ error: 'patch requerido' })
  }

  const invalidKeys = Object.keys(patch).filter(k => !ALLOWED_FIELDS.includes(k))
  if (invalidKeys.length > 0) {
    return res.status(400).json({ error: `Campos no permitidos: ${invalidKeys.join(', ')}` })
  }

  const intIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id))
  if (intIds.length === 0) {
    return res.status(400).json({ error: 'No se proporcionaron IDs válidos' })
  }

  try {
    // Fetch only products that belong to this org
    const products = await prisma.product.findMany({
      where: { id: { in: intIds }, orgId },
      select: { id: true, costPrice: true, feePercent: true, marginPercent: true },
    })

    if (products.length === 0) {
      return res.status(200).json([])
    }

    const updates = products.map(p => {
      const fee    = patch.feePercent    !== undefined ? (parseFloat(patch.feePercent) || 0)    : p.feePercent
      const margin = patch.marginPercent !== undefined ? (parseFloat(patch.marginPercent) || 0) : p.marginPercent
      const derived = computeSellingPrice(p.costPrice, fee, margin)

      const data = {}
      if (patch.feePercent    !== undefined) data.feePercent    = fee
      if (patch.marginPercent !== undefined) data.marginPercent = margin
      if (patch.currency      !== undefined) data.currency      = patch.currency
      if (patch.isActive      !== undefined) data.isActive      = patch.isActive

      // Recompute sellingPrice only for product-type items (costPrice set)
      if (derived !== null && (patch.feePercent !== undefined || patch.marginPercent !== undefined)) {
        data.sellingPrice = derived
      }

      return prisma.product.update({
        where: { id: p.id },
        data,
        include: { provider: { select: { id: true, name: true } } },
      })
    })

    const updated = await Promise.all(updates)
    return res.status(200).json(updated)
  } catch (err) {
    console.error('[bulk] error:', err)
    return res.status(500).json({ error: err.message || 'Error interno' })
  }
}
