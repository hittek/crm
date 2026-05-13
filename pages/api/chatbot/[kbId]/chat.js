/**
 * POST /api/chatbot/[kbId]/chat
 *
 * Internal RAG chat endpoint — requires CRM session auth.
 * Used by the sandbox ChatPanel on the KB management page.
 *
 * Flow when chatbot has tools enabled:
 *   1. Non-streaming call with tools → execute any tool_use blocks (≤3 rounds)
 *   2. Stream final text via SSE
 * Flow with no tools: single streaming call (unchanged).
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
import { waitUntil } from '@vercel/functions'
import prisma from '../../../../lib/prisma'
import { getSession } from '../../../../lib/auth'
import { checkOrgAccess, orgAccessResponse } from '../../../../lib/planLimits'
import { searchChunks } from '../../../../lib/rag'
import { notifications } from '../../../../lib/notifications'
import { shouldEscalate } from '../../../../lib/escalation'
import { buildSystemPrompt, logConversationActivity } from '../../../../lib/channelEngine'
import { summarizeConversation } from '../../../../lib/summarize'
import { getEnabledTools, executeToolCall } from '../../../../lib/chatbotTools'

export const config = { api: { bodyParser: true }, maxDuration: 60 }

const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 800
const TOP_K      = 5
const MAX_TOOL_ROUNDS = 3

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

  // Parallel fan-out: KB + chatbot + RAG search run concurrently
  const [kb, chatbot, chunksResult] = await Promise.all([
    prisma.knowledgeBase.findFirst({
      where:  { id: kbId, orgId: organizationId },
      select: { id: true, name: true, status: true },
    }),
    chatbotId
      ? prisma.chatbot.findFirst({
          where:  { id: parseInt(chatbotId), orgId: organizationId },
          select: {
            id: true, name: true, greeting: true, escalationPhrase: true,
            enabledTools: true, autoCreateContact: true, autoCreateDeal: true,
            defaultDealStage: true, dealTitleTemplate: true,
          },
        })
      : Promise.resolve(null),
    searchChunks({ query: message, kbId, orgId: organizationId, limit: TOP_K })
      .catch(err => { console.error('[chat] RAG search error:', err.message); return null }),
  ])

  if (!kb) return res.status(404).json({ error: 'Base de conocimiento no encontrada' })
  if (kb.status === 'empty') return res.status(422).json({ error: 'La base de conocimiento está vacía. Agrega documentos primero.' })
  if (chunksResult === null) return res.status(500).json({ error: 'Error buscando contexto relevante' })
  const chunks = chunksResult

  // Optional: find or create conversation for persistence
  let conversationId = null
  let conv           = null
  let prevSummary    = null
  if (chatbot && sessionId) {
    conv = await prisma.conversation.findFirst({
      where:   { chatbotId: chatbot.id, sessionId, status: { in: ['open', 'escalated'] } },
      include: { contact: { select: { aiSummary: true, firstName: true, lastName: true } } },
    })

    if (!conv) {
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
      logConversationActivity(conversationId, {
        orgId:     organizationId,
        contactId: conv.contactId ?? null,
        outcome:   'escalated',
        channel:   'sandbox',
        chatbotName: chatbot.name,
      }).catch(() => {})
      return res.json({ conversationId, reply: escalationReply })
    }

    // Persist user message (fire-and-forget)
    prisma.conversationMessage.create({
      data: { conversationId, role: 'user', content: message.trim() },
    }).catch(() => {})
  }

  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No se encontró contexto relevante en la base de conocimiento)'

  const systemPrompt = buildSystemPrompt(
    chatbot ?? { name: kb.name },
    contextText,
    { prevSummary },
  )

  // ── Tool definitions ──────────────────────────────────────────────────────
  const toolDefs    = chatbot ? getEnabledTools(chatbot) : []
  const hasTools    = toolDefs.length > 0
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || ''
  const toolContext = {
    orgId:         organizationId,
    conversationId,
    contactId:     conv?.contactId ?? null,
    dealId:        null,
    appUrl,
  }

  // Load conversation history (last 6 turns)
  let historyMessages = []
  if (conversationId) {
    const rows = await prisma.conversationMessage.findMany({
      where:   { conversationId, role: { in: ['user', 'assistant'] } },
      orderBy: { createdAt: 'desc' },
      take:    12,
    })
    rows.reverse()
    historyMessages = rows.slice(0, -1).map(m => ({
      role:    m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }))
  }

  // ── SSE setup ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection',    'keep-alive')
  res.flushHeaders()

  const emit = data => res.write(`data: ${JSON.stringify(data)}\n\n`)

  // ── Tool-use phase (non-streaming) — runs only when tools are enabled ─────
  let toolMessages = [
    ...historyMessages,
    { role: 'user', content: message.trim() },
  ]
  let fullReply = ''

  if (hasTools) {
    try {
      let rounds = 0
      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++
        const response = await getAnthropic().messages.create({
          model:      MODEL,
          max_tokens: MAX_TOKENS,
          system:     systemPrompt,
          tools:      toolDefs,
          messages:   toolMessages,
        })

        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')

        if (!toolUseBlocks.length) {
          // No tools — extract final text
          const textBlock = response.content.find(b => b.type === 'text')
          fullReply = textBlock?.text?.trim() || ''
          break
        }

        // Execute all tool calls and collect results
        const toolResults = []
        for (const block of toolUseBlocks) {
          const result = await executeToolCall(block.name, block.input, toolContext)

          // Propagate new contactId back into context so create_quote can link it
          if (block.name === 'create_contact' && result.ok && result.data?.contactId) {
            toolContext.contactId = result.data.contactId
            await prisma.conversation.update({
              where: { id: conversationId },
              data:  { contactId: result.data.contactId },
            }).catch(() => {})
          }

          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     result.message,
          })
        }

        toolMessages = [
          ...toolMessages,
          { role: 'assistant', content: response.content },
          { role: 'user',      content: toolResults },
        ]
      }
    } catch (err) {
      console.error('[chat] tool-use error:', err.message)
      fullReply = ''
    }

    // If we got a reply from tool path, stream it as SSE deltas and finish
    if (fullReply) {
      const autoResolved = fullReply.includes('[RESOLVED]')
      const cleanReply   = fullReply.replace(/\n?\[RESOLVED\]\s*$/, '').trim()

      // Emit first frame with conversationId, then rest as plain deltas
      const CHUNK_SIZE = 8
      let first = true
      for (let i = 0; i < cleanReply.length; i += CHUNK_SIZE) {
        const chunk = cleanReply.slice(i, i + CHUNK_SIZE)
        if (first && conversationId) {
          emit({ conversationId, delta: chunk })
          first = false
        } else {
          emit({ delta: chunk })
        }
      }

      if (autoResolved && conversationId) emit({ resolved: true })
      res.write('data: [DONE]\n\n')
      res.end()

      // Post-stream DB writes
      if (conversationId && cleanReply) {
        const ops = [
          prisma.conversationMessage.create({
            data: { conversationId, role: 'assistant', content: cleanReply },
          }),
        ]
        if (autoResolved) {
          ops.push(prisma.conversation.update({
            where: { id: conversationId },
            data:  { status: 'resolved' },
          }))
        }
        waitUntil(
          Promise.all(ops)
            .then(() => {
              if (autoResolved) {
                logConversationActivity(conversationId, {
                  orgId:     organizationId,
                  contactId: toolContext.contactId,
                  outcome:   'resolved',
                  channel:   'sandbox',
                  chatbotName: chatbot?.name,
                }).catch(() => {})
                return summarizeConversation(conversationId).catch(err =>
                  console.error('[chat] summarize failed:', err.message)
                )
              }
            })
            .catch(err => console.error('[chat] post-stream DB write failed:', err.message))
        )
      }
      return
    }
    // Fall through to streaming if tool phase produced no text (shouldn't happen)
  }

  // ── Streaming path (no tools, or tool phase fell through) ─────────────────
  try {
    const stream = getAnthropic().messages.stream({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   toolMessages,
      ...(hasTools && toolDefs.length ? { tools: toolDefs } : {}),
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
  const cleanReply   = fullReply.replace(/\n?\[RESOLVED\]\s*$/, '').trim()

  if (autoResolved && conversationId) emit({ resolved: true })

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
      ops.push(prisma.conversation.update({
        where: { id: conversationId },
        data:  { status: 'resolved' },
      }))
    }
    waitUntil(
      Promise.all(ops)
        .then(() => {
          if (autoResolved) {
            logConversationActivity(conversationId, {
              orgId:     organizationId,
              contactId: toolContext.contactId ?? conv?.contactId ?? null,
              outcome:   'resolved',
              channel:   'sandbox',
              chatbotName: chatbot?.name,
            }).catch(() => {})
            return summarizeConversation(conversationId).catch(err =>
              console.error('[chat] summarize failed:', err.message)
            )
          }
        })
        .catch(err => console.error('[chat] post-stream DB write failed:', err.message))
    )
  }
}
