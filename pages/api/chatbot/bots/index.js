/**
 * GET  /api/chatbot/bots       — list org's chatbots
 * POST /api/chatbot/bots       — create chatbot
 */

import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, role } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const bots = await prisma.chatbot.findMany({
      where:   { orgId: organizationId },
      include: { kb: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(bots)
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Sin permiso' })

    const { name, kbId, greeting, escalationPhrase, primaryColor } = req.body

    if (!name?.trim())     return res.status(400).json({ error: 'nombre requerido' })
    if (!kbId)             return res.status(400).json({ error: 'base de conocimiento requerida' })

    // Verify KB belongs to org
    const kb = await prisma.knowledgeBase.findFirst({ where: { id: parseInt(kbId), orgId: organizationId } })
    if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })

    const bot = await prisma.chatbot.create({
      data: {
        orgId:           organizationId,
        kbId:            parseInt(kbId),
        name:            name.trim(),
        greeting:        greeting?.trim() || 'Hola, ¿en qué puedo ayudarte?',
        escalationPhrase: escalationPhrase?.trim() || null,
        primaryColor:    primaryColor || '#2563eb',
      },
      include: { kb: { select: { id: true, name: true, status: true } } },
    })
    return res.status(201).json(bot)
  }

  res.status(405).end()
}
