/**
 * GET    /api/chatbot/bots/[id]  — get single chatbot
 * PATCH  /api/chatbot/bots/[id]  — update
 * DELETE /api/chatbot/bots/[id]  — delete (cascades conversations)
 */

import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { updateAgentBot, ensureOrgProvisioned } from '../../../../lib/chatwoot'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, role } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const id = parseInt(req.query.id, 10)
  const bot = await prisma.chatbot.findFirst({
    where:   { id, organizationId: organizationId },
    include: { kb: { select: { id: true, name: true, status: true } } },
  })
  if (!bot) return res.status(404).json({ error: 'Chatbot no encontrado' })

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') return res.json(bot)

  if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Sin permiso' })

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const {
      name, kbId, greeting, escalationPhrase, primaryColor, isActive,
      // CRM automation
      autoCreateContact, autoCreateDeal, defaultDealStage, dealTitleTemplate,
      // Tool-use capabilities
      enabledTools,
    } = req.body

    const data = {}
    if (name !== undefined)             data.name             = name.trim()
    if (greeting !== undefined)         data.greeting         = greeting.trim()
    if (escalationPhrase !== undefined) data.escalationPhrase = escalationPhrase?.trim() || null
    if (primaryColor !== undefined)     data.primaryColor     = primaryColor
    if (isActive !== undefined)         data.isActive         = Boolean(isActive)
    if (autoCreateContact !== undefined) data.autoCreateContact = Boolean(autoCreateContact)
    if (autoCreateDeal !== undefined)    data.autoCreateDeal    = Boolean(autoCreateDeal)
    if (defaultDealStage !== undefined)  data.defaultDealStage  = defaultDealStage?.trim() || null
    if (dealTitleTemplate !== undefined) data.dealTitleTemplate = dealTitleTemplate?.trim() || null
    if (enabledTools !== undefined)      data.enabledTools      = enabledTools?.trim() || null
    if (kbId !== undefined) {
      const kb = await prisma.knowledgeBase.findFirst({ where: { id: parseInt(kbId), organizationId: organizationId } })
      if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
      data.kbId = parseInt(kbId)
    }

    const updated = await prisma.chatbot.update({
      where:   { id },
      data,
      include: { kb: { select: { id: true, name: true, status: true } } },
    })

    // Sync name change to Chatwoot AgentBot (non-blocking)
    if (data.name) {
      try {
        const org = await prisma.organization.findUnique({ where: { id: organizationId } })
        if (org?.chatwootAgentBotId) {
          await updateAgentBot(org.chatwootAgentBotId, { name: `${data.name} Bot` })
        }
      } catch (err) {
        console.error(`[chatbot/bots] AgentBot name sync failed for bot ${id}:`, err.message)
      }
    }

    return res.json(updated)
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (role !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar chatbots' })
    await prisma.chatbot.delete({ where: { id } })

    // Reset AgentBot webhook to org default (non-blocking)
    try {
      const org = await prisma.organization.findUnique({ where: { id: organizationId } })
      if (org?.chatwootAgentBotId) {
        const crmBase = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx'
        await updateAgentBot(org.chatwootAgentBotId, {
          outgoing_url: `${crmBase}/api/chatbot/agentbot/${org.slug}`,
        })
      }
    } catch (err) {
      console.error(`[chatbot/bots] AgentBot webhook reset failed for bot ${id}:`, err.message)
    }

    return res.status(204).end()
  }

  res.status(405).end()
}
