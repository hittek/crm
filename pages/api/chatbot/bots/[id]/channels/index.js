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
import { getMe, setWebhook, deleteWebhook } from '../../../../../../lib/channels/telegram'

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
  const bot = await prisma.chatbot.findFirst({ where: { id: chatbotId, orgId: organizationId } })
  if (!bot) return res.status(404).json({ error: 'Chatbot no encontrado' })

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
    if (channel === 'telegram') {
      try {
        const creds = decryptJSON(cfg.credentials)
        await deleteWebhook(creds.botToken)
      } catch (e) {
        console.warn('[channels] Telegram deleteWebhook failed (continuing):', e.message)
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

      // Verify token
      let botInfo
      try {
        botInfo = await getMe(botToken.trim())
      } catch (err) {
        return res.status(400).json({ error: `Token inválido: ${err.message}` })
      }

      // Register webhook (only possible over HTTPS — skipped on local HTTP dev)
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/telegram/${bot.apiKey}`
      const isHttps    = webhookUrl.startsWith('https://')
      let webhookRegistered = false
      if (isHttps) {
        try {
          await setWebhook(botToken.trim(), webhookUrl)
          webhookRegistered = true
        } catch (err) {
          return res.status(500).json({ error: `Error registrando webhook: ${err.message}` })
        }
      }

      const cfg = await prisma.channelConfig.create({
        data: {
          orgId:       organizationId,
          chatbotId,
          channel:     'telegram',
          credentials: encryptJSON({ botToken: botToken.trim() }),
          isActive:    isHttps,   // only active once webhook is registered (requires HTTPS)
          botUsername: botInfo.username,
        },
      })
      return res.status(201).json({
        channel: safeConfig(cfg),
        botInfo,
        webhookRegistered,
        webhookUrl,
        warning: isHttps ? null : 'Token guardado. El webhook se registrará automáticamente al desplegar en producción (requiere HTTPS).',
      })
    }

    // ── WhatsApp ────────────────────────────────────────────────────────────
    if (channel === 'whatsapp') {
      const { phoneNumberId, accessToken, verifyToken } = req.body
      if (!phoneNumberId || !accessToken) {
        return res.status(400).json({ error: 'phoneNumberId y accessToken son requeridos' })
      }
      const cfg = await prisma.channelConfig.create({
        data: {
          orgId:        organizationId,
          chatbotId,
          channel:      'whatsapp',
          credentials:  encryptJSON({ accessToken, verifyToken: verifyToken || '' }),
          isActive:     true,
          phoneNumberId,
        },
      })
      return res.status(201).json({ channel: safeConfig(cfg) })
    }

    // ── Facebook Messenger ──────────────────────────────────────────────────
    if (channel === 'facebook') {
      const { pageId, pageAccessToken, verifyToken, appSecret } = req.body
      if (!pageId || !pageAccessToken) {
        return res.status(400).json({ error: 'pageId y pageAccessToken son requeridos' })
      }
      const cfg = await prisma.channelConfig.create({
        data: {
          orgId:       organizationId,
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
