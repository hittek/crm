/**
 * POST /api/providers/[id]/import-products
 *
 * Accepts the confirmed rows from the extract-prices review UI and
 * upserts them as Product records linked to this provider.
 *
 * Upsert logic: match by (orgId + providerId + sku) when sku is present;
 * otherwise always create a new record.
 *
 * Body:  { rows: [{sku, name, description, unit, costPrice, currency}] }
 * Response: { imported: N, updated: N, total: N }
 */

import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess } from '../../../../lib/planLimits'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' })

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })
  const { organizationId: orgId, role } = session.user
  if (role !== 'admin' && role !== 'manager') return res.status(403).json({ error: 'Sin permiso' })

  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const provider = await prisma.provider.findFirst({ where: { id, orgId } })
  if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado' })

  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No hay productos para importar' })
  }

  const toImport = rows.slice(0, 500) // safety cap

  function computeSellingPrice(costPrice) {
    // No fee/margin defaults on import — user sets those later per product
    return costPrice != null ? costPrice : 0
  }

  let imported = 0
  let updated = 0

  // Fetch existing products for this provider by sku in one query
  const skus = toImport.map(r => r.sku).filter(Boolean)
  const existing = skus.length > 0
    ? await prisma.product.findMany({
        where: { orgId, providerId: id, sku: { in: skus } },
        select: { id: true, sku: true },
      })
    : []
  const existingBySku = Object.fromEntries(existing.map(p => [p.sku, p.id]))

  // Build create / update batches
  const creates = []
  const updates = []

  for (const row of toImport) {
    if (!row.name?.trim()) continue

    const base = {
      name:         row.name.trim().slice(0, 200),
      description:  row.description?.trim()?.slice(0, 500) || null,
      unit:         row.unit || 'unidad',
      costPrice:    row.costPrice ?? null,
      sellingPrice: computeSellingPrice(row.costPrice),
      currency:     row.currency || 'MXN',
    }

    if (row.sku && existingBySku[row.sku]) {
      updates.push({ id: existingBySku[row.sku], ...base })
    } else {
      creates.push({
        orgId,
        providerId: id,
        sku:          row.sku?.slice(0, 100) || null,
        type:         'product',
        feePercent:   0,
        marginPercent: 0,
        isActive:     true,
        ...base,
      })
    }
  }

  // Execute in a transaction
  await prisma.$transaction([
    ...(creates.length > 0 ? [prisma.product.createMany({ data: creates, skipDuplicates: false })] : []),
    ...updates.map(u => {
      const { id: pid, ...data } = u
      return prisma.product.update({ where: { id: pid }, data })
    }),
  ])

  imported = creates.length
  updated  = updates.length

  return res.status(200).json({ imported, updated, total: imported + updated })
}
