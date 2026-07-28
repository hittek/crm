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
import { notifications, notificationService } from '../../../../lib/notifications'

const VALID_STATUSES = ['open', 'resolved', 'escalated']

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, id: agentId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const convId = parseInt(req.query.id, 10)
  if (isNaN(convId)) return res.status(400).json({ error: 'ID inválido' })

  const conv = await prisma.conversation.findFirst({
    where: { id: convId, organizationId: organizationId },
    select: { id: true, status: true, contactId: true, channel: true, chatbotId: true },
  })
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
          organizationId:     organizationId,
          contactId: conv.contactId,
          outcome:   'resolved',
          channel:   conv.channel,
        }).catch(() => {})
      }
    }

    // Fire escalation notification when an agent manually escalates a conversation
    if (status === 'escalated' && conv.status !== 'escalated') {
      // Look up the chatbot for context (optional — use fallback if not linked)
      const chatbot = conv.chatbotId
        ? await prisma.chatbot.findUnique({ where: { id: conv.chatbotId }, select: { name: true } })
        : null
      notifications.chatEscalated(
        { id: convId },
        chatbot || { name: 'CRM' },
        organizationId
      ).catch(err => console.error('[status] chatEscalated notification failed:', err.message))
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

    // Notify the agent receiving the conversation (skip self-assign)
    if (targetId !== agentId) {
      notificationService.notify({
        type: 'chat_escalated',
        title: 'Conversación asignada',
        message: `${session.user.name || 'Un agente'} te asignó una conversación`,
        link: `/conversations?id=${convId}`,
        metadata: { entityType: 'conversation', entityId: convId },
        userId: targetId,
        organizationId,
      }).catch(() => {})
    }

    return res.json({ conversation: updated, forwardedTo: targetUser })
  }

  res.setHeader('Allow', ['PATCH', 'POST'])
  return res.status(405).end()
}
