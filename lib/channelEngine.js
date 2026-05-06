/**
 * Channel engine — shared non-streaming RAG + Claude processing.
 *
 * Used by all channel webhook handlers (Telegram, WhatsApp, Facebook).
 * The sandbox ChatPanel uses the streaming endpoint directly.
 *
 * processMessage({ chatbot, channel, sessionId, userMessage, metadata? })
 *   → { reply, conversationId, escalated, isNew }
 *
 * Session lifecycle
 * ─────────────────
 * A "session" maps to one Conversation row. The session is "active" while
 * status is open or escalated. When a conversation is resolved the next
 * message from the same user opens a fresh conversation (new row, same
 * sessionId so we can still track the user across sessions).
 *
 * Users can also explicitly start fresh by sending /new, /reset, /reiniciar,
 * /nuevo, or /start (Telegram's default first message after /start).
 *
 * History window
 * ──────────────
 * The last HISTORY_TURNS assistant+user exchange pairs are loaded from the DB
 * and prepended to the Claude messages array. This gives the AI context about
 * the current conversation without blowing the context window.
 * Token budget: ~150 tokens/turn × 6 turns = ~900 tokens of history.
 */
import prisma           from './prisma.js'
import { searchChunks } from './rag.js'
import { shouldEscalate } from './escalation.js'

const MODEL         = 'claude-haiku-4-5-20251001'
const MAX_TOKENS    = 512
/** Number of prior assistant↔user exchange pairs to include in context. */
const HISTORY_TURNS = 6

function getAnthropic() {
  const Anthropic = eval('require')('@anthropic-ai/sdk')
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ── Reset commands ─────────────────────────────────────────────────────────────
const RESET_COMMANDS = new Set([
  '/new', '/nuevo', '/reset', '/reiniciar', '/start',
])

function isResetCommand(text) {
  return RESET_COMMANDS.has(text.toLowerCase().trim())
}

// ── System prompt ──────────────────────────────────────────────────────────────

export function buildSystemPrompt(chatbot, contextText) {
  const botName = chatbot?.name || 'Asistente'
  return `Eres ${botName}, un asistente de soporte.
Responde usando únicamente el siguiente contexto. Si la respuesta no está en el contexto, dilo claramente.
Sé conciso y directo. Responde en el mismo idioma que el usuario.
No uses formato markdown: sin asteriscos, sin almohadillas, sin guiones como viñetas. Solo texto plano con saltos de línea cuando sea necesario.

CONTEXTO:
${contextText}`
}

// ── Conversation history → Claude messages array ───────────────────────────────

/**
 * Load the last HISTORY_TURNS×2 messages (user + assistant alternating) from
 * the DB and convert them to the Anthropic messages format.
 *
 * Only user and assistant roles are included — agent messages (human takeover)
 * are skipped because Claude doesn't need to know about internal replies.
 *
 * The current user message is NOT included here; the caller appends it last.
 */
async function loadHistory(conversationId) {
  const rows = await prisma.conversationMessage.findMany({
    where:   { conversationId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'desc' },
    take:    HISTORY_TURNS * 2,   // last N turns (each turn = user + assistant)
  })

  // Rows come back newest-first; reverse to chronological order
  rows.reverse()

  return rows.map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {object} opts.chatbot     - Full chatbot record
 * @param {string} opts.channel     - 'telegram' | 'whatsapp' | 'facebook'
 * @param {string} opts.sessionId   - Platform-stable identifier (chat ID, PSID, phone)
 * @param {string} opts.userMessage - Raw text from the end user
 * @param {object} [opts.metadata]  - Extra data stored on the conversation
 *
 * @returns {{ reply: string|null, conversationId: number, escalated: boolean, isNew: boolean, handedOff: boolean }}
 */
export async function processMessage({ chatbot, channel, sessionId, userMessage, metadata }) {
  const { id: chatbotId, orgId, kbId } = chatbot
  const text = userMessage.trim()

  // ── Reset command (/new, /start, etc.) ────────────────────────────────────
  if (isResetCommand(text)) {
    // Close any active conversation for this session so the next message starts fresh
    await prisma.conversation.updateMany({
      where:  { chatbotId, sessionId, channel, status: { in: ['open', 'escalated'] } },
      data:   { status: 'resolved', updatedAt: new Date() },
    })
    const greeting = chatbot.greeting || '¡Hola! ¿En qué puedo ayudarte hoy?'
    // Create the fresh conversation so it exists before returning
    const newConv = await prisma.conversation.create({
      data: {
        chatbotId,
        orgId,
        sessionId,
        channel,
        status: 'open',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    })
    await prisma.conversationMessage.create({
      data: { conversationId: newConv.id, role: 'assistant', content: greeting },
    })
    return { reply: greeting, conversationId: newConv.id, escalated: false, isNew: true, handedOff: false }
  }

  // ── Find or create active conversation ────────────────────────────────────
  let conv = await prisma.conversation.findFirst({
    where: { chatbotId, sessionId, channel, status: { in: ['open', 'escalated'] } },
  })
  const isNew = !conv
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        chatbotId,
        orgId,
        sessionId,
        channel,
        status: 'open',
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      },
    })
  }
  const conversationId = conv.id

  // ── Persist user message ──────────────────────────────────────────────────
  await prisma.conversationMessage.create({
    data: { conversationId, role: 'user', content: text },
  })

  // ── Agent handoff guard ───────────────────────────────────────────────────
  if (conv.assignedToId) {
    return { reply: null, conversationId, escalated: false, isNew, handedOff: true }
  }

  // ── Escalation check ──────────────────────────────────────────────────────
  if (chatbot.escalationPhrase && await shouldEscalate(text, chatbot.escalationPhrase)) {
    const reply = 'Un agente se comunicará contigo en breve.'
    await prisma.$transaction([
      prisma.conversationMessage.create({
        data: { conversationId, role: 'assistant', content: reply },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data:  { status: 'escalated', updatedAt: new Date() },
      }),
    ])
    try {
      const { notifications } = await import('./notifications.js')
      notifications.chatEscalated({ id: conversationId }, chatbot, orgId).catch(err =>
        console.error('[channelEngine] chatEscalated notification failed:', err.message)
      )
    } catch (err) {
      console.error('[channelEngine] could not import notifications:', err.message)
    }
    return { reply, conversationId, escalated: true, isNew, handedOff: false }
  }

  // ── RAG retrieval ─────────────────────────────────────────────────────────
  let chunks = []
  try {
    chunks = await searchChunks({ query: text, kbId, orgId, limit: 5 })
  } catch (err) {
    console.error('[channelEngine] RAG error:', err.message)
  }

  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No se encontró contexto relevante en la base de conocimiento)'

  // ── Conversation history ──────────────────────────────────────────────────
  // Load prior turns (excluding the message we just saved — it's appended last)
  const priorMessages = await loadHistory(conversationId)
  // The last entry is the user message we just persisted — drop it so we don't duplicate
  const historyMessages = priorMessages.slice(0, -1)

  // ── Claude completion ─────────────────────────────────────────────────────
  let reply = 'No pude generar una respuesta en este momento. Por favor intenta de nuevo.'
  try {
    const response = await getAnthropic().messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     buildSystemPrompt(chatbot, contextText),
      messages:   [
        ...historyMessages,
        { role: 'user', content: text },
      ],
    })
    reply = response.content?.[0]?.text?.trim() || reply
  } catch (err) {
    console.error('[channelEngine] Anthropic error:', err.message)
  }

  // ── Persist assistant reply ───────────────────────────────────────────────
  await prisma.$transaction([
    prisma.conversationMessage.create({
      data: { conversationId, role: 'assistant', content: reply },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data:  { updatedAt: new Date() },
    }),
  ])

  return { reply, conversationId, escalated: false, isNew, handedOff: false }
}
