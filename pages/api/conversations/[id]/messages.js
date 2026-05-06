/**
 * GET  /api/conversations/[id]/messages  — fetch messages (for live polling)
 * POST /api/conversations/[id]/messages  — agent sends a reply
 */
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'

async function getConv(id, orgId) {
  return prisma.conversation.findFirst({ where: { id, orgId } })
}

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const conv = await getConv(convId, organizationId)
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const messages = await prisma.conversationMessage.findMany({
      where:   { conversationId: convId },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ messages, status: conv.status })
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Mensaje vacío' })

    const [msg] = await prisma.$transaction([
      prisma.conversationMessage.create({
        data: { conversationId: convId, role: 'agent', content: content.trim() },
      }),
      prisma.conversation.update({
        where: { id: convId },
        data:  { updatedAt: new Date() },
      }),
    ])
    return res.status(201).json({ message: msg })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
