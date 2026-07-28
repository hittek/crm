/**
 * POST /api/chatbot/[kbId]/chat
 *
 * Sandbox chat endpoint — requires CRM session auth.
 * Used by the ChatPanel on the chatbot management page.
 *
 * This is a thin SSE wrapper around lib/channelEngine.processMessage.
 * All chatbot logic (RAG, tools, escalation, persistence, activity logging)
 * lives in processMessage — the same code path used by Telegram, WhatsApp,
 * and Facebook webhooks. What you test here is exactly what runs in production.
 *
 * Body:  { message, sessionId?, chatbotId? }
 * SSE frames:
 *   data: {"delta":"..."}              — streamed tokens (simulated chunking)
 *   data: {"conversationId":N,...}     — first frame when chatbotId provided
 *   data: {"escalated":true}           — emitted when conversation escalated
 *   data: {"resolved":true}            — emitted when AI auto-resolves
 *   data: {"handedOff":true}           — agent has taken over, reply is null
 *   data: [DONE]
 *   data: {"error":"..."}
 */

import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { processMessage } from '../../../../lib/channelEngine'

export const config = { api: { bodyParser: true }, maxDuration: 60 }

// Full chatbot field set — must stay in sync with webhook handlers
const CHATBOT_SELECT = {
  id: true, organizationId: true, kbId: true,
  name: true, greeting: true, escalationPhrase: true, isActive: true,
  enabledTools: true, autoCreateContact: true, autoCreateDeal: true,
  defaultDealStage: true, dealTitleTemplate: true,
}

const CHUNK_SIZE = 8  // characters per SSE delta (simulates typing)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const kbId      = parseInt(req.query.kbId, 10)
  const { message, sessionId, chatbotId } = req.body

  if (!kbId || isNaN(kbId)) return res.status(400).json({ error: 'kbId inválido' })
  if (!message?.trim())      return res.status(400).json({ error: 'message requerido' })
  if (message.length > 2000) return res.status(400).json({ error: 'message demasiado largo (máx 2000 chars)' })

  // Validate KB belongs to this org
  const kb = await prisma.knowledgeBase.findFirst({
    where:  { id: kbId, organizationId: organizationId },
    select: { id: true, status: true },
  })
  if (!kb)                   return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
  if (kb.status === 'empty') return res.status(422).json({ error: 'La base de conocimiento está vacía. Agrega documentos primero.' })

  // Load chatbot with FULL field set (identical to webhook handlers)
  let chatbot = null
  if (chatbotId) {
    chatbot = await prisma.chatbot.findFirst({
      where:  { id: parseInt(chatbotId), organizationId: organizationId, isActive: true },
      select: CHATBOT_SELECT,
    })
  }

  // Fall back to a minimal synthetic chatbot using the KB directly
  if (!chatbot) {
    chatbot = {
      id: null, organizationId: organizationId, kbId,
      name: kb.name ?? 'Asistente',
      greeting: null, escalationPhrase: null, isActive: true,
      enabledTools: null, autoCreateContact: false, autoCreateDeal: false,
      defaultDealStage: 'lead', dealTitleTemplate: 'Consulta vía {channel}',
    }
  }

  // ── SSE setup ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const emit = data => res.write(`data: ${JSON.stringify(data)}\n\n`)
  const sid  = sessionId || `sandbox-${organizationId}-${Date.now()}`

  try {
    // ── Delegate to processMessage — shared with all channel webhooks ─────
    const result = await processMessage({
      chatbot,
      channel:     'sandbox',
      sessionId:   sid,
      userMessage: message,
    })

    const { reply, conversationId, escalated, handedOff, autoResolved } = result

    if (handedOff) {
      emit({ conversationId, handedOff: true })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    if (escalated || !reply) {
      emit({ conversationId, escalated: true, delta: reply || '' })
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    // Stream reply as simulated typing (chunked SSE deltas)
    let first = true
    for (let i = 0; i < reply.length; i += CHUNK_SIZE) {
      const chunk = reply.slice(i, i + CHUNK_SIZE)
      if (first) {
        emit({ conversationId, delta: chunk })
        first = false
      } else {
        emit({ delta: chunk })
      }
    }

    if (autoResolved) emit({ resolved: true })

  } catch (err) {
    console.error('[sandbox-chat] processMessage error:', err.message)
    emit({ error: 'Error generando respuesta. Intenta de nuevo.' })
  }

  res.write('data: [DONE]\n\n')
  res.end()
}
