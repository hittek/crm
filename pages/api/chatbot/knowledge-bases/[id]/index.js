import prisma from '../../../../../lib/prisma'
import { getSession } from '../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const kbId = parseInt(req.query.id)
  if (isNaN(kbId)) return res.status(400).json({ error: 'ID inválido' })

  const kb = await prisma.knowledgeBase.findFirst({
    where: { id: kbId, organizationId: organizationId },
    include: { _count: { select: { documents: true } } },
  })
  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    return res.status(200).json(kb)
  }

  // ── PUT: update name/description ─────────────────────────────────────────
  if (req.method === 'PUT') {
    const { name, description } = req.body ?? {}
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const updated = await prisma.knowledgeBase.update({
      where: { id: kbId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
      },
    })
    return res.status(200).json(updated)
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    await prisma.knowledgeBase.delete({ where: { id: kbId } })
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
  return res.status(405).end()
}
