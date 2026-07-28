/**
 * GET  /api/webhook/facebook  — Meta webhook verification challenge
 * POST /api/webhook/facebook  — Incoming Messenger messages
 *
 * Routing: inbound messages carry a recipient.id (page ID); we look up ChannelConfig by pageId.
 */
import prisma             from '../../../../lib/prisma'
import { decryptJSON }    from '../../../../lib/crypto'
import { processMessage } from '../../../../lib/channelEngine'

async function sendMessenger(pageAccessToken, recipientId, text) {
  const r = await fetch('https://graph.facebook.com/v19.0/me/messages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pageAccessToken}` },
    body:    JSON.stringify({
      recipient: { id: recipientId },
      message:   { text },
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    console.error('[webhook/facebook] send error:', err)
  }
}

export default async function handler(req, res) {
  // ── Verification handshake ────────────────────────────────────────────────
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode']
    const token     = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode !== 'subscribe') return res.status(403).end()

    // Find matching ChannelConfig by verifyToken
    const configs = await prisma.channelConfig.findMany({
      where: { channel: 'facebook', isActive: true },
    })
    const match = configs.find(c => {
      try { return decryptJSON(c.credentials).verifyToken === token } catch { return false }
    })
    if (!match) return res.status(403).end()
    return res.status(200).send(challenge)
  }

  // ── Incoming message ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    // Always 200 immediately
    res.status(200).end()

    try {
      if (req.body?.object !== 'page') return

      for (const entry of req.body?.entry || []) {
        for (const event of entry?.messaging || []) {
          // Only process text messages (ignore echoes, delivery receipts, etc.)
          if (!event?.message?.text || event?.message?.is_echo) continue

          const senderId  = event.sender?.id
          const pageId    = event.recipient?.id
          const text      = event.message.text
          if (!senderId || !pageId || !text?.trim()) continue

          const config = await prisma.channelConfig.findFirst({
            where:   { pageId, channel: 'facebook', isActive: true },
            include: { chatbot: { select: { id: true, organizationId: true, kbId: true, name: true, greeting: true, escalationPhrase: true, isActive: true, enabledTools: true, autoCreateContact: true, autoCreateDeal: true, defaultDealStage: true, dealTitleTemplate: true } } },
          })
          if (!config || !config.chatbot?.isActive) continue

          const { pageAccessToken } = decryptJSON(config.credentials)

          const { reply } = await processMessage({
            chatbot:     config.chatbot,
            channel:     'facebook',
            sessionId:   `fb-${senderId}`,
            userMessage: text,
            metadata:    { messengerSenderId: senderId, pageId },
          })

          if (reply) {
            await sendMessenger(pageAccessToken, senderId, reply)
          }
        }
      }
    } catch (err) {
      console.error('[webhook/facebook]', err.message)
    }
    return
  }

  return res.status(405).end()
}
