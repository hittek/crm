/**
 * GET  /api/conversations/[id]/messages  — fetch messages + events (for live polling)
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

  const { organizationId, id: agentId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const conv = await getConv(convId, organizationId)
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const [messages, events] = await Promise.all([
      prisma.conversationMessage.findMany({
        where:   { conversationId: convId },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.conversationEvent.findMany({
        where:   { conversationId: convId },
        orderBy: { createdAt: 'asc' },
        include: {
          user:   { select: { id: true, name: true, avatar: true } },
          toUser: { select: { id: true, name: true, avatar: true } },
        },
      }),
    ])
    return res.json({ messages, events, status: conv.status, assignedToId: conv.assignedToId })
  }

  // ── POST ─────────────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'Mensaje vacío' })

    const isFirstReply = !conv.assignedToId
    const ops = [
      prisma.conversationMessage.create({
        data: { conversationId: convId, role: 'agent', content: content.trim() },
      }),
      prisma.conversation.update({
        where: { id: convId },
        data:  {
          updatedAt:   new Date(),
          // Assign to this agent on first reply
          ...(isFirstReply ? { assignedToId: agentId } : {}),
        },
      }),
    ]

    // Record a picked_up event on the first reply only
    if (isFirstReply) {
      ops.push(
        prisma.conversationEvent.create({
          data: { conversationId: convId, userId: agentId, type: 'picked_up' },
        })
      )
    }

    const [msg] = await prisma.$transaction(ops)
    return res.status(201).json({ message: msg, pickedUp: isFirstReply })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
