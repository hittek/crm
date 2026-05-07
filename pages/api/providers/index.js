import { getIronSession } from 'iron-session'
import { sessionOptions } from '../../../lib/session'
import { getPrisma } from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/orgAccess'

function computeSellingPrice(costPrice, feePercent, marginPercent) {
  if (costPrice == null) return null
  return costPrice * (1 + (feePercent || 0) / 100) * (1 + (marginPercent || 0) / 100)
}

export default async function handler(req, res) {
  const session = await getIronSession(req, res, sessionOptions)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })

  const prisma = getPrisma()
  const { orgId, role } = session.user

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  // ── GET /api/providers ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const providers = await prisma.provider.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return res.status(200).json(providers)
  }

  // ── POST /api/providers ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    const { name, contactName, email, phone, website, notes } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Nombre requerido' })

    const provider = await prisma.provider.create({
      data: { orgId, name: name.trim(), contactName, email, phone, website, notes },
    })
    return res.status(201).json(provider)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).json({ error: 'Método no permitido' })
}
