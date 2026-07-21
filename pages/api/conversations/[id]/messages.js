/**
 * GET  /api/conversations/[id]/messages  — fetch messages + events (for live polling)
 * POST /api/conversations/[id]/messages  — agent sends a reply
 */
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { hasMinRole } from '../../../../lib/auth'
import { sendMessage as sendTelegram } from '../../../../lib/channels/telegram'
import { sendChatwootMessage } from '../../../../lib/chatwoot'
import { decryptJSON } from '../../../../lib/crypto'

async function getConv(id, orgId) {
  return prisma.conversation.findFirst({ where: { id, orgId } })
}

function isAdminOrManager(role) {
  return hasMinRole(role, 'manager')
}

/**
 * Forward an agent reply to the originating channel.
 * Silently ignores errors so the agent reply always persists even if delivery fails.
 */
async function forwardToChannel(conv, content) {
  if (!conv.channel || conv.channel === 'sandbox' || conv.channel === 'web') return

  // Chatwoot-managed conversations — no ChannelConfig row needed
  if (conv.channel === 'chatwoot') {
    try {
      const parts = (conv.sessionId || '').split('-')
      if (parts.length === 3 && parts[0] === 'chatwoot') {
        const accountId = parseInt(parts[1], 10)
        const chatwootConvId = parseInt(parts[2], 10)
        const org = await prisma.organization.findUnique({
          where: { id: conv.orgId },
          select: { chatwootAgentBotToken: true },
        })
        if (org?.chatwootAgentBotToken && accountId && chatwootConvId) {
          await sendChatwootMessage(accountId, chatwootConvId, content, org.chatwootAgentBotToken)
          console.log(`[chatwoot-reply] sent agent reply to conv ${chatwootConvId} in account ${accountId}`)
        }
      }
    } catch (err) {
      console.error('[messages] chatwoot forwardToChannel failed:', err.message)
    }
    return
  }

  try {
    const channelConfig = await prisma.channelConfig.findFirst({
      where: { chatbotId: conv.chatbotId, channel: conv.channel, isActive: true },
    })
    if (!channelConfig) return

    const creds    = decryptJSON(channelConfig.credentials)
    const metadata = typeof conv.metadata === 'string'
      ? JSON.parse(conv.metadata)
      : (conv.metadata || {})

    if (conv.channel === 'telegram') {
      const chatId = metadata.telegramChatId || metadata.fromId
      if (!chatId || !creds?.botToken) return
      await sendTelegram(creds.botToken, chatId, content)
    }

    // WhatsApp / Facebook placeholders — implement when Meta credentials are wired
  } catch (err) {
    console.error('[messages] forwardToChannel failed:', err.message)
  }
}

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, id: agentId, role: agentRole, name: agentName } = session.user
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

    const isAdmin        = isAdminOrManager(agentRole)
    const isAssignee     = conv.assignedToId === agentId
    const isUnassigned   = !conv.assignedToId
    const isEscalated    = conv.status === 'escalated'
    const isJoiningAdmin = isAdmin && !isUnassigned && !isAssignee

    // Access gate: unassigned → anyone; assigned → only assignee or admin/manager
    if (!isUnassigned && !isAssignee && !isAdmin) {
      return res.status(403).json({
        error: 'Esta conversación está asignada a otro agente. Solo administradores pueden intervenir.',
      })
    }

    // When an agent replies to an escalated conv, transition back to open
    const statusUpdate = isEscalated ? { status: 'open' } : {}

    const ops = [
      prisma.conversationMessage.create({
        data: {
          conversationId: convId,
          role:      'agent',
          content:   content.trim(),
          userId:    agentId,
          agentName: agentName || null,
        },
      }),
      prisma.conversation.update({
        where: { id: convId },
        data:  {
          updatedAt:   new Date(),
          agentActive: true,   // silence the bot for future inbound messages
          ...statusUpdate,
          // First reply on unassigned → pick it up
          ...(isUnassigned ? { assignedToId: agentId } : {}),
        },
      }),
    ]

    // picked_up event on first reply to an unassigned or escalated conversation
    if (isUnassigned || isEscalated) {
      ops.push(
        prisma.conversationEvent.create({
          data: { conversationId: convId, userId: agentId, type: 'picked_up' },
        })
      )
    }

    // joined event when admin/manager intervenes in someone else's conversation
    if (isJoiningAdmin) {
      ops.push(
        prisma.conversationEvent.create({
          data: {
            conversationId: convId,
            userId: agentId,
            type:   'joined',
            note:   `${agentName} intervino en la conversación`,
          },
        })
      )
    }

    const [msg] = await prisma.$transaction(ops)

    // Forward to originating channel (fire-and-forget, non-blocking)
    forwardToChannel(conv, content.trim())

    return res.status(201).json({
      message:   msg,
      pickedUp:  isUnassigned || isEscalated,
      joined:    isJoiningAdmin,
      newStatus: isEscalated ? 'open' : conv.status,
    })
  }

  res.setHeader('Allow', ['GET', 'POST'])
  return res.status(405).end()
}
