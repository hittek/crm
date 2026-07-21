/**
 * GET  /api/chatbot/bots       — list org's chatbots
 * POST /api/chatbot/bots       — create chatbot
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
        greeting:        greeting?.trim() || 'Hola, \u00bfen qu\u00e9 puedo ayudarte?',
        escalationPhrase: escalationPhrase?.trim() || null,
        primaryColor:    primaryColor || '#2563eb',
      },
      include: { kb: { select: { id: true, name: true, status: true } } },
    })

    // Update AgentBot webhook to route to this specific chatbot (non-blocking)
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, slug: true, chatwootAccountId: true, chatwootAgentBotId: true },
      })
      if (org) {
        const ids = await ensureOrgProvisioned(org, prisma)
        const crmBase = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx'
        await updateAgentBot(ids.chatwootAgentBotId, {
          outgoing_url: `${crmBase}/api/chatbot/agentbot/${org.slug}?botKey=${bot.apiKey}`,
        })
        console.log(`[chatbot/bots] AgentBot webhook set for bot ${bot.id} (org ${org.id})`)
      }
    } catch (err) {
      console.error(`[chatbot/bots] AgentBot webhook update failed for bot ${bot.id}:`, err.message)
    }

    return res.status(201).json(bot)
  }

  res.status(405).end()
}
