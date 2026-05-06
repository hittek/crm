/**
 * GET    /api/chatbot/bots/[id]  — get single chatbot
 * PATCH  /api/chatbot/bots/[id]  — update
 * DELETE /api/chatbot/bots/[id]  — delete (cascades conversations)
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

  const id = parseInt(req.query.id, 10)
  const bot = await prisma.chatbot.findFirst({
    where:   { id, orgId: organizationId },
    include: { kb: { select: { id: true, name: true, status: true } } },
  })
  if (!bot) return res.status(404).json({ error: 'Chatbot no encontrado' })

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') return res.json(bot)

  if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Sin permiso' })

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { name, kbId, greeting, escalationPhrase, primaryColor, isActive } = req.body

    const data = {}
    if (name !== undefined)             data.name             = name.trim()
    if (greeting !== undefined)         data.greeting         = greeting.trim()
    if (escalationPhrase !== undefined) data.escalationPhrase = escalationPhrase?.trim() || null
    if (primaryColor !== undefined)     data.primaryColor     = primaryColor
    if (isActive !== undefined)         data.isActive         = Boolean(isActive)
    if (kbId !== undefined) {
      const kb = await prisma.knowledgeBase.findFirst({ where: { id: parseInt(kbId), orgId: organizationId } })
      if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
      data.kbId = parseInt(kbId)
    }

    const updated = await prisma.chatbot.update({
      where:   { id },
      data,
      include: { kb: { select: { id: true, name: true, status: true } } },
    })
    return res.json(updated)
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar chatbots' })
    await prisma.chatbot.delete({ where: { id } })
    return res.status(204).end()
  }

  res.status(405).end()
}
