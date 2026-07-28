/**
 * POST /api/chatbot/agentbot/[slug]
 *
 * Chatwoot AgentBot webhook endpoint.
 *
 * Chatwoot POSTs here on every inbox event for this org's AgentBot.
 * We handle `message_created` (incoming from contact) → Claude+RAG → reply.
 * All other events return 200 immediately so Chatwoot doesn't retry.
 *
 * Query params:
 *   ?botKey=<chatbot.apiKey>  — optional; routes to a specific chatbot.
 *                               Falls back to the org's most-recently-created
 *                               active chatbot when absent.
 *
 * Chatwoot webhook payload (relevant fields):
 *   event              — 'message_created' | 'conversation_resolved' | …
 *   message_type       — 'incoming' | 'outgoing' | 'template' | …
 *   content            — message text
 *   conversation.id    — Chatwoot conversation ID
 *   sender.id          — Chatwoot contact ID (used as sessionId prefix)
 *   account.id         — Chatwoot account ID (must match org.chatwootAccountId)
 *   inbox.id           — Chatwoot inbox ID
 *
 * The bot replies by calling the Chatwoot Conversations Messages API using
 * the AgentBot's own access token (stored in org.chatwootAgentBotToken).
 */

import prisma from '../../../../lib/prisma'
import { processMessage } from '../../../../lib/channelEngine'
import { sendChatwootMessage, handoffConversation } from '../../../../lib/chatwoot'

// Do not block incoming Chatwoot webhooks with a JSON body size limit
export const config = { api: { bodyParser: true }, maxDuration: 60 }

const CHATBOT_SELECT = {
  id: true, orgId: true, kbId: true,
  name: true, greeting: true, escalationPhrase: true, isActive: true,
  enabledTools: true, autoCreateContact: true, autoCreateDeal: true,
  defaultDealStage: true, dealTitleTemplate: true, apiKey: true,
}

export default async function handler(req, res) {
  // Chatwoot expects a fast 200; all errors are logged, never blocking
  if (req.method !== 'POST') return res.status(405).end()

  const { slug } = req.query
  const { botKey } = req.query
  const payload = req.body

  const { event, message_type, content, conversation, sender, account } = payload || {}

  // Acknowledge immediately — only process message_created + incoming
  if (event !== 'message_created' || message_type !== 'incoming') {
    return res.status(200).end()
  }

  // Validate content
  if (!content?.trim()) return res.status(200).end()

  // Load org by slug — must have Chatwoot provisioned
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, chatwootAccountId: true,
      chatwootAgentBotId: true, chatwootAgentBotToken: true,
    },
  })

  if (!org?.chatwootAccountId || !org.chatwootAgentBotToken) {
    console.error(`[agentbot] org not found or not provisioned: slug=${slug}`)
    return res.status(200).end() // 200 so Chatwoot doesn't retry forever
  }

  // Verify account ID matches (safety check — prevents cross-tenant replay)
  if (account?.id && account.id !== org.chatwootAccountId) {
    console.error(`[agentbot] account mismatch: got ${account.id}, expected ${org.chatwootAccountId}`)
    return res.status(200).end()
  }

  // Resolve chatbot — prefer botKey match, fall back to latest active
  let chatbot = null
  if (botKey) {
    chatbot = await prisma.chatbot.findFirst({
      where: { apiKey: botKey, orgId: org.id, isActive: true },
      select: CHATBOT_SELECT,
    })
  }
  if (!chatbot) {
    chatbot = await prisma.chatbot.findFirst({
      where: { orgId: org.id, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: CHATBOT_SELECT,
    })
  }
  if (!chatbot) {
    console.warn(`[agentbot] no active chatbot for org ${org.id} (slug=${slug}) — skipping`)
    return res.status(200).end()
  }

  // Respond 200 immediately so Chatwoot doesn't time out waiting on Claude
  res.status(200).end()

  // Async processing — run after response sent
  processAndReply({ org, chatbot, content, conversation, sender, account }).catch(err => {
    console.error(`[agentbot] processing error for org ${org.id} conv ${conversation?.id}:`, err.message)
  })
}

async function processAndReply({ org, chatbot, content, conversation, sender, account }) {
  const convId    = conversation?.id
  const accountId = org.chatwootAccountId
  const token     = org.chatwootAgentBotToken

  // sessionId ties this Chatwoot conversation to a CRM Conversation row
  // Use chatwoot-{accountId}-{convId} so each Chatwoot conversation = one CRM session
  const sessionId = `chatwoot-${accountId}-${convId}`

  const senderName = sender?.name || sender?.email || 'Usuario'
  const senderPhone = sender?.phone_number || null

  // Map Chatwoot channel class → CRM channel name
  // Chatwoot sends the Ruby class name e.g. "Channel::Whatsapp", "Channel::FacebookPages"
  const rawChannel = (conversation?.channel || '').toLowerCase()
  const crmChannel =
    rawChannel.includes('whatsapp')      ? 'whatsapp'   :
    rawChannel.includes('telegram')      ? 'telegram'   :
    rawChannel.includes('facebook')      ? 'facebook'   :
    rawChannel.includes('instagram')     ? 'instagram'  :
    rawChannel.includes('twitter')       ? 'twitter'    :
    rawChannel.includes('tiktok')        ? 'tiktok'     :
    rawChannel.includes('sms')           ? 'sms'        :
    rawChannel.includes('email')         ? 'email'      :
    rawChannel.includes('webwidget') || rawChannel.includes('web_widget') ? 'web' :
    'chatwoot'

  console.log(`[agentbot] message from ${senderName} in conv ${convId} channel=${crmChannel} (chatbot ${chatbot.id}, org ${org.id})`)

  let reply, escalated, handedOff
  try {
    ({ reply, escalated, handedOff } = await processMessage({
      chatbot,
      channel:     crmChannel,
      sessionId,
      userMessage: content.trim(),
      metadata: {
        chatwootAccountId:    accountId,
        chatwootConvId:       convId,
        chatwootSenderId:     sender?.id,
        senderName,
        senderPhone,
      },
    }))
  } catch (err) {
    console.error(`[agentbot] processMessage error conv ${convId}:`, err.message)
    return
  }

  // Escalated or agent takeover — hand off to human in Chatwoot
  if (escalated || handedOff) {
    console.log(`[agentbot] escalating conv ${convId} to human agent`)
    try {
      // Send the escalation reply first (if any), then hand off
      if (reply) {
        await sendChatwootMessage(accountId, convId, reply, token)
      }
      await handoffConversation(accountId, convId, token)
    } catch (err) {
      console.error(`[agentbot] handoff error conv ${convId}:`, err.message)
    }
    return
  }

  // Normal reply
  if (reply) {
    try {
      await sendChatwootMessage(accountId, convId, reply, token)
      console.log(`[agentbot] replied to conv ${convId}: "${reply.slice(0, 80)}…"`)
    } catch (err) {
      console.error(`[agentbot] sendChatwootMessage error conv ${convId}:`, err.message)
    }
  }
}
