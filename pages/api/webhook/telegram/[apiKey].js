/**
 * POST /api/webhook/telegram/[apiKey]
 *
 * Telegram delivers updates to this URL. The chatbot's apiKey in the path
 * identifies which chatbot + channel config to use.
 *
 * No auth header — Telegram doesn't send one; security comes from the
 * unique per-chatbot URL being hard to guess (cuid).
 */
import prisma               from '../../../../lib/prisma'
import { decryptJSON }      from '../../../../lib/crypto'
import { processMessage }   from '../../../../lib/channelEngine'
import { sendMessage, sendMediaGroup } from '../../../../lib/channels/telegram'

export default async function handler(req, res) {
  // Telegram requires 200 even on error — otherwise it retries for 24h
  if (req.method !== 'POST') return res.status(200).end()

  try {
    const { apiKey } = req.query

    // Resolve chatbot + channel config
    const chatbot = await prisma.chatbot.findUnique({
      where:  { apiKey },
      select: { id: true, orgId: true, kbId: true, name: true, greeting: true, escalationPhrase: true, isActive: true, enabledTools: true, autoCreateContact: true, autoCreateDeal: true, defaultDealStage: true, dealTitleTemplate: true },
    })
    if (!chatbot || !chatbot.isActive) return res.status(200).end()

    const config = await prisma.channelConfig.findUnique({
      where:  { chatbotId_channel: { chatbotId: chatbot.id, channel: 'telegram' } },
      select: { credentials: true, isActive: true },
    })
    if (!config || !config.isActive) return res.status(200).end()

    const { botToken } = decryptJSON(config.credentials)

    // Parse Telegram update
    const update = req.body
    const msg    = update?.message
    if (!msg?.text) return res.status(200).end()  // ignore non-text (stickers, voice, etc.)

    const chatId    = String(msg.chat.id)
    const text      = msg.text
    const sessionId = `tg-${chatId}`

    // Process through RAG engine
    const { reply, imageAttachments } = await processMessage({
      chatbot,
      channel:     'telegram',
      sessionId,
      userMessage: text,
      metadata:    {
        telegramChatId:  chatId,
        fromId:          String(msg.from?.id || ''),
        fromName:        msg.from?.first_name || '',
        fromUsername:    msg.from?.username  || '',
      },
    })

    // Send product images first (before the text reply), if any
    if (imageAttachments?.length) {
      await sendMediaGroup(botToken, chatId, imageAttachments).catch(err =>
        console.error('[webhook/telegram] sendMediaGroup failed:', err.message)
      )
    }

    // Reply on Telegram (skip if agent has taken over)
    if (reply) {
      await sendMessage(botToken, chatId, reply)
    }

  } catch (err) {
    // Log but always return 200 so Telegram doesn't retry
    console.error('[webhook/telegram]', err.message)
  }

  return res.status(200).end()
}
