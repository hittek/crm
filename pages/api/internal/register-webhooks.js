/**
 * POST /api/internal/register-webhooks
 *
 * Re-registers Telegram webhooks for all ChannelConfigs where isActive=false.
 * Called automatically by scripts/dev.sh after ngrok starts.
 *
 * Protected by INTERNAL_API_SECRET (optional in dev — skipped if not set).
 * In production, set INTERNAL_API_SECRET and call from CI/post-deploy hook.
 */
import prisma             from '../../../lib/prisma'
import { decryptJSON }    from '../../../lib/crypto'
import { setWebhook }     from '../../../lib/channels/telegram'

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).end()
  }

  // Optional secret guard (skipped in dev if not set)
  const secret = process.env.INTERNAL_API_SECRET
  if (secret) {
    const auth = req.headers['x-internal-secret']
    if (auth !== secret) return res.status(401).json({ error: 'Unauthorized' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl?.startsWith('https://')) {
    return res.status(400).json({ error: 'NEXT_PUBLIC_APP_URL is not HTTPS — cannot register Telegram webhooks' })
  }

  // Find all inactive Telegram configs
  const pending = await prisma.channelConfig.findMany({
    where:   { channel: 'telegram', isActive: false },
    include: { chatbot: { select: { apiKey: true } } },
  })

  if (pending.length === 0) {
    return res.json({ registered: 0, message: 'No pending webhooks' })
  }

  const results = await Promise.allSettled(
    pending.map(async cfg => {
      const { botToken }   = decryptJSON(cfg.credentials)
      const webhookUrl     = `${appUrl}/api/webhook/telegram/${cfg.chatbot.apiKey}`
      await setWebhook(botToken, webhookUrl)
      await prisma.channelConfig.update({
        where: { id: cfg.id },
        data:  { isActive: true },
      })
      return { id: cfg.id, webhookUrl }
    })
  )

  const registered = results.filter(r => r.status === 'fulfilled').length
  const failed     = results.filter(r => r.status === 'rejected')
    .map(r => r.reason?.message || 'unknown')

  console.log(`[register-webhooks] registered=${registered} failed=${failed.length}`)
  return res.json({ registered, failed })
}
