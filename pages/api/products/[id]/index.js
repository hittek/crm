
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
  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const product = await prisma.product.findFirst({ where: { id, orgId } })
  if (!product) return res.status(404).json({ error: 'No encontrado' })

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const full = await prisma.product.findFirst({
      where: { id, orgId },
      include: { provider: { select: { id: true, name: true } } },
    })
    return res.status(200).json(full)
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    const {
      name, description, sku, type, unit, providerId,
      costPrice, feePercent, marginPercent, sellingPrice: manualSellingPrice,
      currency, isActive, imageUrl,
    } = req.body

    const cp = costPrice !== undefined ? (costPrice != null ? parseFloat(costPrice) : null) : product.costPrice
    const fee = feePercent !== undefined ? parseFloat(feePercent) : product.feePercent
    const margin = marginPercent !== undefined ? parseFloat(marginPercent) : product.marginPercent
    const derived = computeSellingPrice(cp, fee, margin)
    const sellingPrice = derived ?? (manualSellingPrice !== undefined ? parseFloat(manualSellingPrice) : product.sellingPrice)

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(sku !== undefined && { sku }),
        ...(type !== undefined && { type }),
        ...(unit !== undefined && { unit }),
        ...(providerId !== undefined && { providerId: providerId ? parseInt(providerId) : null }),
        ...(costPrice !== undefined && { costPrice: cp }),
        ...(feePercent !== undefined && { feePercent: fee }),
        ...(marginPercent !== undefined && { marginPercent: margin }),
        sellingPrice,
        ...(currency !== undefined && { currency }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
      },
      include: { provider: { select: { id: true, name: true } } },
    })
    return res.status(200).json(updated)
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (role !== 'admin') return res.status(403).json({ error: 'Solo administradores' })
    await prisma.product.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Método no permitido' })
}
