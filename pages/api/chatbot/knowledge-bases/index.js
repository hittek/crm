import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse, checkPlanLimit, planLimitResponse } from '../../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  // ── GET: list knowledge bases ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const kbs = await prisma.knowledgeBase.findMany({
      where: { organizationId: organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { documents: true } },
      },
    })
    return res.status(200).json(kbs)
  }

  // ── POST: create knowledge base ──────────────────────────────────────────
  if (req.method === 'POST') {
    const limit = await checkPlanLimit(prisma, organizationId, 'knowledgeBases')
    if (!limit.allowed) return planLimitResponse(res, { ...limit, entity: 'bases de conocimiento' })

    const { name, description } = req.body ?? {}
    if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' })

    const kb = await prisma.knowledgeBase.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: organizationId,
        createdBy: session.user.email,
      },
    })
    return res.status(201).json(kb)
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
