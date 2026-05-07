/**
 * POST /api/chatbot/[kbId]/chat
 *
 * Internal RAG chat endpoint — requires CRM session auth.
 * Used by the sandbox ChatPanel on the KB management page.
 *
 * SPENDING GUARDS
 * ──────────────
 * Per user message, exactly:
 *   • 1 Voyage API call  — embed the query (via searchChunks)
 *   • 1 Anthropic call   — generate reply, max_tokens: 800 hard cap
 * No retries, no loops, no polling.
 *
 * Body:  { message, sessionId?, chatbotId? }
 * SSE frames:
 *   data: {"delta":"..."}              — streamed tokens
 *   data: {"conversationId":N,...}     — first frame when chatbotId provided
 *   data: {"resolved":true}            — emitted when AI auto-resolves (before DONE)
 *   data: [DONE]
 *   data: {"error":"..."}
 */

import Anthropic from '@anthropic-ai/sdk'
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { searchChunks } from '../../../../lib/rag'
import { notifications } from '../../../../lib/notifications'
import { shouldEscalate } from '../../../../lib/escalation'
import { buildSystemPrompt } from '../../../../lib/channelEngine'
import { summarizeConversation } from '../../../../lib/summarize'

export const config = { api: { bodyParser: true } }

const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 800
const TOP_K      = 5

let _anthropic = null
function getAnthropic() {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: key })
  }
  return _anthropic
}

// ── Cross-session memory: last resolved conversation for this session ─────────
async function loadPrevSessionContext(chatbotId, sessionId) {
  const prev = await prisma.conversation.findFirst({
    where:   { chatbotId, sessionId, channel: 'sandbox', status: 'resolved' },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        where:   { role: { in: ['user', 'assistant'] } },
        orderBy: { createdAt: 'desc' },
        take:    8,
      },
    },
  })
  if (!prev) return null
  if (prev.summary) return prev.summary
  if (!prev.messages.length) return null
  prev.messages.reverse()
  return prev.messages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Soporte'}: ${m.content.slice(0, 200)}`)
    .join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const { organizationId } = session.user
  const access = await checkOrgAccess(prisma, organizationId)
  if (access.blocked) return orgAccessResponse(res, access)

  const kbId = parseInt(req.query.kbId, 10)
  const { message, sessionId, chatbotId } = req.body

  if (!kbId || isNaN(kbId))  return res.status(400).json({ error: 'kbId inválido' })
  if (!message?.trim())       return res.status(400).json({ error: 'message requerido' })
  if (message.length > 2000)  return res.status(400).json({ error: 'message demasiado largo (máx 2000 chars)' })

  // Verify KB belongs to org
  const kb = await prisma.knowledgeBase.findFirst({
    where:  { id: kbId, orgId: organizationId },
    select: { id: true, name: true, status: true },
  })
  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
  if (kb.status === 'empty') return res.status(422).json({ error: 'La base de conocimiento está vacía. Agrega documentos primero.' })

  // Optional: load chatbot config for name/greeting/escalation
  let chatbot = null
  if (chatbotId) {
    chatbot = await prisma.chatbot.findFirst({
      where:  { id: parseInt(chatbotId), orgId: organizationId },
      select: { id: true, name: true, greeting: true, escalationPhrase: true },
    })
  }

  // Optional: find or create conversation for persistence
  let conversationId = null
  let prevSummary    = null
  if (chatbot && sessionId) {
    let conv = await prisma.conversation.findFirst({
      where:   { chatbotId: chatbot.id, sessionId, status: { in: ['open', 'escalated'] } },
      include: { contact: { select: { aiSummary: true, firstName: true, lastName: true } } },
    })

    if (!conv) {
      // Load cross-session memory before creating the new conversation
      prevSummary = await loadPrevSessionContext(chatbot.id, sessionId)

      conv = await prisma.conversation.create({
        data:    { chatbotId: chatbot.id, orgId: organizationId, sessionId, channel: 'sandbox' },
        include: { contact: { select: { aiSummary: true, firstName: true, lastName: true } } },
      })
    }
    conversationId = conv.id

    // If an agent has taken over, store the message and let them handle it
    if (conv.assignedToId) {
      await prisma.conversationMessage.create({
        data: { conversationId, role: 'user', content: message.trim() },
      })
      return res.json({ conversationId, reply: null, handedOff: true })
    }

    // Check escalation before AI
    if (chatbot.escalationPhrase && await shouldEscalate(message, chatbot.escalationPhrase)) {
      const escalationReply = 'Un agente se comunicará contigo en breve.'
      await prisma.conversationMessage.createMany({
        data: [
          { conversationId, role: 'user',      content: message.trim() },
          { conversationId, role: 'assistant', content: escalationReply },
        ],
      })
      await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'escalated' } })
      notifications.chatEscalated({ id: conversationId }, chatbot, organizationId).catch(err =>
        console.error('[chat] chatEscalated notification failed:', err.message)
      )
      return res.json({ conversationId, reply: escalationReply })
    }

    // Persist user message (fire-and-forget)
    prisma.conversationMessage.create({
      data: { conversationId, role: 'user', content: message.trim() },
    }).catch(() => {})
  }

  // RAG: 1 Voyage call + 1 SQL
  let chunks
  try {
    chunks = await searchChunks({ query: message, kbId, orgId: organizationId, limit: TOP_K })
  } catch (err) {
    console.error('[chat] RAG search error:', err.message)
    return res.status(500).json({ error: 'Error buscando contexto relevante' })
  }

  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No se encontró contexto relevante en la base de conocimiento)'

  // Build system prompt via shared helper (includes cross-session + auto-resolve instruction)
  const systemPrompt = buildSystemPrompt(
    chatbot ?? { name: kb.name },
    contextText,
    { prevSummary },
  )

  res.setHeader('Content-Type',  'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const emit = data => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // Load conversation history (last 6 turns) so the AI can follow the thread
  let historyMessages = []
  if (conversationId) {
    const rows = await prisma.conversationMessage.findMany({
      where:   { conversationId, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'desc' },
      take:    12,  // 6 turns × 2 roles
    })
    rows.reverse()
    // Drop the last entry — it's the user message we just saved
    historyMessages = rows.slice(0, -1).map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
  }

  let fullReply = ''
  try {
    const stream = getAnthropic().messages.stream({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   [
        ...historyMessages,
        { role: 'user', content: message.trim() },
      ],
    })

    let firstFrame = true
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        const delta = event.delta.text
        fullReply += delta
        if (firstFrame && conversationId) {
          emit({ conversationId, delta })
          firstFrame = false
        } else {
          emit({ delta })
        }
      }
    }

  } catch (err) {
    console.error('[chat] Anthropic error:', err.message)
    emit({ error: 'Error generando respuesta. Intenta de nuevo.' })
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  // ── Auto-resolve detection ────────────────────────────────────────────────
  const autoResolved = fullReply.includes('[RESOLVED]')
  // Strip the marker from the clean reply that gets persisted and sent to client
  const cleanReply = fullReply.replace(/\n?\[RESOLVED\]\s*$/, '').trim()

  // Emit resolved event BEFORE [DONE] so client can handle it
  if (autoResolved && conversationId) {
    emit({ resolved: true })
  }

  res.write('data: [DONE]\n\n')
  res.end()

  // ── Post-stream DB writes (fire-and-forget) ───────────────────────────────
  if (conversationId && cleanReply) {
    const ops = [
      prisma.conversationMessage.create({
        data: { conversationId, role: 'assistant', content: cleanReply },
      }),
    ]
    if (autoResolved) {
      ops.push(
        prisma.conversation.update({
          where: { id: conversationId },
          data:  { status: 'resolved' },
        }),
      )
    }
    Promise.all(ops)
      .then(() => {
        if (autoResolved) {
          summarizeConversation(conversationId).catch(err =>
            console.error('[chat] summarize failed:', err.message)
          )
        }
      })
      .catch(err => console.error('[chat] post-stream DB write failed:', err.message))
  }
}
