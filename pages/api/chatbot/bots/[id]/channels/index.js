/**
 * GET    /api/chatbot/bots/[id]/channels         — list channel configs (no credentials in response)
 * POST   /api/chatbot/bots/[id]/channels         — connect a channel
 * DELETE /api/chatbot/bots/[id]/channels/[chan]  — disconnect a channel (handled below via query param)
 *
 * DELETE uses ?channel=telegram|whatsapp|facebook as a query param on this same route.
 */
import prisma             from '../../../../../../lib/prisma'
import { getSession }     from '../../../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../../../lib/planLimits'
import { encryptJSON, decryptJSON } from '../../../../../../lib/crypto'
import { randomUUID } from 'crypto'
import { getMe } from '../../../../../../lib/channels/telegram'
import { createChatwootInbox, deleteInbox as deleteChatwootInbox } from '../../../../../../lib/chatwoot'

function safeConfig(cfg) {
  // Never expose raw credentials to the client
  const { credentials: _, ...rest } = cfg
  return rest
}

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId, role } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const chatbotId = parseInt(req.query.id, 10)
  const bot = await prisma.chatbot.findFirst({ where: { id: chatbotId, organizationId: organizationId } })
  if (!bot) return res.status(404).json({ error: 'Chatbot no encontrado' })

  // Load org for Chatwoot provisioning data
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, chatwootAccountId: true, chatwootAgentBotId: true, chatwootAdminToken: true },
  })

  if (!['admin', 'manager'].includes(role)) return res.status(403).json({ error: 'Sin permiso' })

  // ── GET — list connected channels ─────────────────────────────────────────
  if (req.method === 'GET') {
    const configs = await prisma.channelConfig.findMany({
      where:   { chatbotId },
      orderBy: { createdAt: 'asc' },
    })
    return res.json({ channels: configs.map(safeConfig) })
  }

  // ── DELETE — disconnect a channel ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    const channel = req.query.channel
    if (!channel) return res.status(400).json({ error: 'Falta parámetro channel' })

    const cfg = await prisma.channelConfig.findUnique({
      where: { chatbotId_channel: { chatbotId, channel } },
    })
    if (!cfg) return res.status(404).json({ error: 'Canal no conectado' })

    // Channel-specific teardown
    if (channel === 'telegram' || channel === 'whatsapp') {
      // Delete Chatwoot inbox if managed via Chatwoot
      if (cfg.chatwootInboxId && org?.chatwootAccountId && org?.chatwootAdminToken) {
        try {
          await deleteChatwootInbox(org.chatwootAccountId, cfg.chatwootInboxId, org.chatwootAdminToken)
          console.log(`[channels] deleted Chatwoot inbox ${cfg.chatwootInboxId} for chatbot ${chatbotId}`)
        } catch (e) {
          console.warn('[channels] deleteChatwootInbox failed (continuing):', e.message)
        }
      }
    }

    await prisma.channelConfig.delete({ where: { chatbotId_channel: { chatbotId, channel } } })
    return res.json({ ok: true })
  }

  // ── POST — connect a channel ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { channel } = req.body
    if (!['telegram', 'whatsapp', 'facebook'].includes(channel)) {
      return res.status(400).json({ error: 'Canal no válido' })
    }

    // Check not already connected
    const existing = await prisma.channelConfig.findUnique({
      where: { chatbotId_channel: { chatbotId, channel } },
    })
    if (existing) return res.status(409).json({ error: 'Canal ya conectado' })

    // ── Telegram ────────────────────────────────────────────────────────────
    if (channel === 'telegram') {
      const { botToken } = req.body
      if (!botToken?.trim()) return res.status(400).json({ error: 'Token de bot requerido' })

      // Verify token via Telegram API
      let botInfo
      try {
        botInfo = await getMe(botToken.trim())
      } catch (err) {
        return res.status(400).json({ error: `Token inválido: ${err.message}` })
      }

      // Create Chatwoot Telegram inbox — Chatwoot handles webhook registration
      let chatwootInboxId = null
      if (org?.chatwootAccountId && org?.chatwootAdminToken) {
        try {
          const inbox = await createChatwootInbox(
            org.chatwootAccountId,
            `${botInfo.first_name || botInfo.username} (Telegram)`,
            'telegram',
            { bot_token: botToken.trim() },
            org.chatwootAgentBotId,
            org.chatwootAdminToken,
          )
          chatwootInboxId = inbox.id
          console.log(`[channels] created Chatwoot Telegram inbox ${chatwootInboxId} for chatbot ${chatbotId}`)
        } catch (err) {
          return res.status(500).json({ error: `Error creando inbox en Chatwoot: ${err.message}` })
        }
      } else {
        return res.status(500).json({ error: 'Organización sin cuenta Chatwoot — contactar soporte' })
      }

      const cfg = await prisma.channelConfig.create({
        data: {
          organizationId:           organizationId,
          chatbotId,
          channel:         'telegram',
          credentials:     encryptJSON({ botToken: botToken.trim() }),
          isActive:        true,
          botUsername:     botInfo.username,
          chatwootInboxId,
        },
      })
      return res.status(201).json({
        channel: safeConfig(cfg),
        botInfo,
        chatwootInboxId,
      })
    }

    // ── WhatsApp ────────────────────────────────────────────────────────────
    if (channel === 'whatsapp') {
      const { phoneNumberId, accessToken, verifyToken, businessAccountId } = req.body
      if (!phoneNumberId || !accessToken || !businessAccountId) {
        return res.status(400).json({ error: 'phoneNumberId, businessAccountId y accessToken son requeridos' })
      }
      if (!org?.chatwootAccountId || !org?.chatwootAdminToken) {
        return res.status(500).json({ error: 'Organización sin cuenta Chatwoot — contactar soporte' })
      }

      // Derive a phone number label from phoneNumberId for the inbox name
      const inboxName = `WhatsApp ${phoneNumberId}`
      let chatwootInboxId = null
      try {
        const inbox = await createChatwootInbox(
          org.chatwootAccountId,
          inboxName,
          'whatsapp',
          {
            phone_number:    '+1',  // placeholder — Chatwoot derives from Meta
            provider:        'whatsapp_cloud',
            provider_config: {
              api_key:              accessToken.trim(),
              phone_number_id:      phoneNumberId.trim(),
              business_account_id:  businessAccountId.trim(),
              webhook_verify_token: verifyToken?.trim() || randomUUID().replace(/-/g, '').slice(0, 24),
            },
          },
          org.chatwootAgentBotId,
          org.chatwootAdminToken,
        )
        chatwootInboxId = inbox.id
        console.log(`[channels] created Chatwoot WhatsApp inbox ${chatwootInboxId} for chatbot ${chatbotId}`)
      } catch (err) {
        return res.status(500).json({ error: `Error creando inbox WhatsApp en Chatwoot: ${err.message}` })
      }

      const cfg = await prisma.channelConfig.create({
        data: {
          organizationId:          organizationId,
          chatbotId,
          channel:        'whatsapp',
          credentials:    encryptJSON({ accessToken: accessToken.trim(), verifyToken: verifyToken?.trim() || '' }),
          isActive:       true,
          phoneNumberId:  phoneNumberId.trim(),
          chatwootInboxId,
        },
      })
      return res.status(201).json({ channel: safeConfig(cfg), chatwootInboxId })
    }

    // ── Facebook Messenger ──────────────────────────────────────────────────
    if (channel === 'facebook') {
      const { pageId, pageAccessToken, verifyToken, appSecret } = req.body
      if (!pageId || !pageAccessToken) {
        return res.status(400).json({ error: 'pageId y pageAccessToken son requeridos' })
      }
      const cfg = await prisma.channelConfig.create({
        data: {
          organizationId:       organizationId,
          chatbotId,
          channel:     'facebook',
          credentials: encryptJSON({ pageAccessToken, verifyToken: verifyToken || '', appSecret: appSecret || '' }),
          isActive:    true,
          pageId,
        },
      })
      return res.status(201).json({ channel: safeConfig(cfg) })
    }
  }

  // ── PATCH — re-register webhook (called after HTTPS deploy) ─────────────
  if (req.method === 'PATCH') {
    const channel = req.query.channel
    if (channel !== 'telegram') return res.status(400).json({ error: 'Solo soportado para Telegram' })

    const cfg = await prisma.channelConfig.findUnique({
      where: { chatbotId_channel: { chatbotId, channel } },
    })
    if (!cfg) return res.status(404).json({ error: 'Canal no conectado' })
    if (cfg.isActive) return res.json({ ok: true, already: true })

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/telegram/${bot.apiKey}`
    if (!webhookUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'NEXT_PUBLIC_APP_URL debe ser HTTPS para registrar el webhook' })
    }

    const { botToken } = decryptJSON(cfg.credentials)
    await setWebhook(botToken, webhookUrl)
    await prisma.channelConfig.update({
      where: { chatbotId_channel: { chatbotId, channel } },
      data:  { isActive: true },
    })
    return res.json({ ok: true, webhookUrl })
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE'])
  return res.status(405).end()
}
