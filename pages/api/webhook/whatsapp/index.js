/**
 * GET  /api/webhook/whatsapp  — Meta webhook verification challenge
 * POST /api/webhook/whatsapp  — Incoming WhatsApp messages
 *
 * Routing: inbound messages carry a phoneNumberId; we look up the ChannelConfig by that.
 */
import prisma             from '../../../../lib/prisma'
import { decryptJSON }    from '../../../../lib/crypto'
import { processMessage } from '../../../../lib/channelEngine'

async function sendWhatsAppImage(phoneNumberId, accessToken, to, imageUrl, caption) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body:    JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, ...(caption && { caption }) },
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    console.error('[webhook/whatsapp] sendImage error:', err)
  }
}

async function sendWhatsApp(phoneNumberId, accessToken, to, text) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`
  const r = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body:    JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!r.ok) {
    const err = await r.text()
    console.error('[webhook/whatsapp] send error:', err)
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
      where: { channel: 'whatsapp', isActive: true },
    })
    const match = configs.find(c => {
      try { return decryptJSON(c.credentials).verifyToken === token } catch { return false }
    })
    if (!match) return res.status(403).end()
    return res.status(200).send(challenge)
  }

  // ── Incoming message ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    // Always 200 immediately so Meta doesn't retry
    res.status(200).end()

    try {
      const entry = req.body?.entry?.[0]
      const change = entry?.changes?.[0]
      if (change?.field !== 'messages') return

      const value = change.value
      const phoneNumberId = value?.metadata?.phone_number_id
      if (!phoneNumberId) return

      const msg = value?.messages?.[0]
      if (!msg || msg.type !== 'text') return  // ignore non-text for now

      const from = msg.from  // sender's WhatsApp number (E.164)
      const text = msg.text?.body
      if (!text?.trim()) return

      // Look up ChannelConfig by phoneNumberId
      const config = await prisma.channelConfig.findFirst({
        where:   { phoneNumberId, channel: 'whatsapp', isActive: true },
        include: { chatbot: { select: { id: true, orgId: true, kbId: true, name: true, greeting: true, escalationPhrase: true, isActive: true, enabledTools: true, autoCreateContact: true, autoCreateDeal: true, defaultDealStage: true, dealTitleTemplate: true } } },
      })
      if (!config || !config.chatbot?.isActive) return

      const { accessToken } = decryptJSON(config.credentials)

      // ── Agent message sent directly from WhatsApp app ─────────────────────
      // When the business number sends a message (agent using WA app), Meta
      // echoes it back as a webhook with msg.from === the business display number.
      // Detect #agente / #bot commands anywhere in the text (case-insensitive).
      const isAgentMessage = value?.metadata?.display_phone_number &&
        from.replace(/\D/g, '').endsWith(value.metadata.display_phone_number.replace(/\D/g, ''))

      if (isAgentMessage) {
        const lowerText = text.toLowerCase()
        const takeoverMatch = lowerText.match(/#agente(?:\s+([\d\s+\-()]+))?/)
        const reactivateMatch = lowerText.match(/#bot(?:\s+([\d\s+\-()]+))?/)

        const command = takeoverMatch ? 'takeover' : reactivateMatch ? 'reactivate' : null

        // Strip command hashtags from the stored/displayed text
        const cleanText = text.replace(/#agente\b/gi, '').replace(/#bot\b/gi, '').trim()

        // Extract optional customer number from command, e.g. "#agente 521234567890"
        const rawPhone = (takeoverMatch?.[1] || reactivateMatch?.[1] || '').replace(/\D/g, '')
        const customerSessionId = rawPhone ? `wa-${rawPhone}` : null

        const convWhere = {
          orgId:   config.chatbot.orgId,
          channel: 'whatsapp',
          status:  { in: ['open', 'escalated'] },
          ...(customerSessionId ? { sessionId: customerSessionId } : {}),
          ...(command === 'reactivate' ? { agentActive: true } : {}),
        }

        const targetConv = await prisma.conversation.findFirst({
          where:   convWhere,
          orderBy: { updatedAt: 'desc' },
          select:  { id: true, sessionId: true },
        })

        if (targetConv) {
          const ops = []

          // Save agent message to history (role 'agent') if there's actual text
          if (cleanText) {
            ops.push(prisma.conversationMessage.create({
              data: { conversationId: targetConv.id, role: 'agent', content: cleanText },
            }))
          }

          // Apply agentActive change if a command was present
          if (command) {
            ops.push(prisma.conversation.update({
              where: { id: targetConv.id },
              data:  { agentActive: command === 'takeover', updatedAt: new Date() },
            }))
          }

          if (ops.length) await prisma.$transaction(ops)
          console.log(`[webhook/whatsapp] agent msg saved — conv=${targetConv.id} command=${command || 'none'} text=${cleanText?.slice(0, 60)}`)
        } else {
          console.log(`[webhook/whatsapp] agent msg — no matching conv (phone=${rawPhone || 'any'}) command=${command || 'none'}`)
        }
        return
      }

      // ── Check if a human agent has taken over this conversation ───────────
      const sessionId = `wa-${from}`
      const activeConv = await prisma.conversation.findFirst({
        where:  { sessionId, channel: 'whatsapp', status: { in: ['open', 'escalated'] } },
        select: { id: true, agentActive: true },
      })
      if (activeConv?.agentActive) {
        // Log inbound message to the existing conversation but don't invoke bot
        await prisma.conversationMessage.create({
          data: { conversationId: activeConv.id, role: 'user', content: text },
        }).catch(() => {})
        console.log(`[webhook/whatsapp] bot silenced (agent active) conv=${activeConv.id} from=${from}`)
        return
      }

      const { reply, imageAttachments } = await processMessage({
        chatbot:     config.chatbot,
        channel:     'whatsapp',
        sessionId:   `wa-${from}`,
        userMessage: text,
        metadata:    { whatsappFrom: from, phoneNumberId, displayPhone: value?.metadata?.display_phone_number },
      })

      // Send product images first (before text), if any
      if (imageAttachments?.length) {
        for (const img of imageAttachments) {
          await sendWhatsAppImage(phoneNumberId, accessToken, from, img.url, img.caption).catch(err =>
            console.error('[webhook/whatsapp] sendImage failed:', err.message)
          )
        }
      }

      if (reply) {
        await sendWhatsApp(phoneNumberId, accessToken, from, reply)
      }
    } catch (err) {
      console.error('[webhook/whatsapp]', err.message)
    }
    return
  }

  return res.status(405).end()
}
