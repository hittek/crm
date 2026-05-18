/**
 * PATCH /api/conversations/[id]/status
 * Body: { status: 'open' | 'resolved' | 'escalated', note?: string }
 *
 * POST /api/conversations/[id]/status
 * Body: { action: 'forward', toUserId: number, note?: string }
 */
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { summarizeConversation } from '../../../../lib/summarize'
import { logConversationActivity } from '../../../../lib/channelEngine'

const VALID_STATUSES = ['open', 'resolved', 'escalated']

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, id: agentId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const conv = await prisma.conversation.findFirst({ where: { id: convId, orgId: organizationId } })
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  // ── PATCH — status change ─────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { status, note, agentActive } = req.body

    // Handle agentActive toggle independently (no status change required)
    if (agentActive !== undefined && status === undefined) {
      const updated = await prisma.conversation.update({
        where: { id: convId },
        data:  { agentActive: Boolean(agentActive) },
      })
      return res.json({ conversation: updated })
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores: ${VALID_STATUSES.join(', ')}` })
    }

    // Map status → event type (only record meaningful transitions)
    const eventType =
      status === 'resolved' ? 'resolved' :
      (status === 'open' && conv.status !== 'open') ? 'reopened' :
      null

    const [updated] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: convId },
        data:  { status },
      }),
      // Always create an event for resolved/reopened
      ...(eventType ? [
        prisma.conversationEvent.create({
          data: { conversationId: convId, userId: agentId, type: eventType, note: note || null },
        }),
      ] : []),
    ])

    // Generate AI summary + log CRM activity when agent manually resolves
    if (status === 'resolved') {
      summarizeConversation(convId).catch(err =>
        console.error('[status] summarize failed:', err.message)
      )
      if (conv.contactId) {
        logConversationActivity(convId, {
          orgId:     organizationId,
          contactId: conv.contactId,
          outcome:   'resolved',
          channel:   conv.channel,
        }).catch(() => {})
      }
    }

    return res.json({ conversation: updated })
  }

  // ── POST — forward to another agent ──────────────────────────────────────
  if (req.method === 'POST') {
    const { action, toUserId, note } = req.body

    if (action !== 'forward') {
      return res.status(400).json({ error: 'Acción no reconocida. Usa action: "forward"' })
    }

    const targetId = parseInt(toUserId, 10)
    if (isNaN(targetId)) return res.status(400).json({ error: 'toUserId inválido' })

    // Verify the target user belongs to the same org
    const targetUser = await prisma.user.findFirst({
      where: { id: targetId, organizationId },
      select: { id: true, name: true },
    })
    if (!targetUser) return res.status(404).json({ error: 'Usuario destino no encontrado' })

    const [updated] = await prisma.$transaction([
      prisma.conversation.update({
        where: { id: convId },
        data:  { assignedToId: targetId },
      }),
      prisma.conversationEvent.create({
        data: {
          conversationId: convId,
          userId:   agentId,
          type:     'forwarded',
          toUserId: targetId,
          note:     note || null,
        },
      }),
    ])

    return res.json({ conversation: updated, forwardedTo: targetUser })
  }

  res.setHeader('Allow', ['PATCH', 'POST'])
  return res.status(405).end()
}
