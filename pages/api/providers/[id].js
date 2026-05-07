import { getIronSession } from 'iron-session'
import { sessionOptions } from '../../../lib/session'
import { getPrisma } from '../../../lib/prisma'
import { checkOrgAccess } from '../../../lib/orgAccess'

export default async function handler(req, res) {
  const session = await getIronSession(req, res, sessionOptions)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })

  const prisma = getPrisma()
  const { orgId, role } = session.user
  const id = parseInt(req.query.id)
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' })

  const access = await checkOrgAccess(prisma, orgId)
  if (access.blocked) return res.status(402).json({ error: access.reason })

  const provider = await prisma.provider.findFirst({ where: { id, orgId } })
  if (!provider) return res.status(404).json({ error: 'No encontrado' })

  // ── GET ───────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const full = await prisma.provider.findFirst({
      where: { id, orgId },
      include: { products: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    })
    return res.status(200).json(full)
  }

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (role !== 'admin' && role !== 'manager') {
      return res.status(403).json({ error: 'Sin permiso' })
    }
    const { name, contactName, email, phone, website, notes, isActive } = req.body
    const updated = await prisma.provider.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(contactName !== undefined && { contactName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    })
    return res.status(200).json(updated)
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (role !== 'admin') return res.status(403).json({ error: 'Solo administradores' })
    await prisma.provider.delete({ where: { id } })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
  return res.status(405).json({ error: 'Método no permitido' })
}
