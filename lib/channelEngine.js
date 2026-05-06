/**
 * Channel engine — shared non-streaming RAG + Claude processing.
 *
 * Used by all channel webhook handlers (Telegram, WhatsApp, Facebook).
 * The sandbox ChatPanel uses the streaming endpoint directly.
 *
 * processMessage({ chatbot, channel, sessionId, userMessage, metadata? })
 *   → { reply, conversationId, escalated }
 */
import prisma          from './prisma.js'
import { searchChunks } from './rag.js'
import { shouldEscalate } from './escalation.js'

const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 512

function getAnthropic() {
  const Anthropic = eval('require')('@anthropic-ai/sdk')
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ── Shared system prompt (identical to chat.js) ───────────────────────────────

export function buildSystemPrompt(chatbot, contextText) {
  const botName = chatbot?.name || 'Asistente'
  return `Eres ${botName}, un asistente de soporte.
Responde usando únicamente el siguiente contexto. Si la respuesta no está en el contexto, dilo claramente.
Sé conciso y directo. Responde en el mismo idioma que el usuario.
No uses formato markdown: sin asteriscos, sin almohadillas, sin guiones como viñetas. Solo texto plano con saltos de línea cuando sea necesario.

CONTEXTO:
${contextText}`
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {object} opts.chatbot     - Full chatbot record (id, orgId, kbId, name, greeting, escalationPhrase)
 * @param {string} opts.channel     - 'telegram' | 'whatsapp' | 'facebook'
 * @param {string} opts.sessionId   - Stable session identifier from the platform (chat ID, sender PSID, etc.)
 * @param {string} opts.userMessage - Raw text from the end user
 * @param {object} [opts.metadata]  - Optional extra data stored on the conversation (e.g. { phone, name })
 *
 * @returns {{ reply: string, conversationId: number, escalated: boolean }}
 */
export async function processMessage({ chatbot, channel, sessionId, userMessage, metadata }) {
  const { id: chatbotId, orgId, kbId } = chatbot
  const text = userMessage.trim()

  // Find or create conversation for this session
  let conv = await prisma.conversation.findFirst({
    where: { chatbotId, sessionId, channel, status: { in: ['open', 'escalated'] } },
  })
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

  // Persist user message
  await prisma.conversationMessage.create({
    data: { conversationId, role: 'user', content: text },
  })

  // If an agent has taken over this conversation, don't respond with AI —
  // the agent is handling it. Just store the message and return null.
  if (conv.assignedToId) {
    return { reply: null, conversationId, escalated: false, handedOff: true }
  }

  // Escalation check
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

    // CRM notification (non-blocking)
    try {
      const { notifications } = await import('./notifications.js')
      notifications.chatEscalated({ id: conversationId }, chatbot, orgId).catch(err =>
        console.error('[channelEngine] chatEscalated notification failed:', err.message)
      )
    } catch (err) {
      console.error('[channelEngine] could not import notifications:', err.message)
    }

    return { reply, conversationId, escalated: true }
  }

  // RAG retrieval
  let chunks = []
  try {
    chunks = await searchChunks({ query: text, kbId, orgId, limit: 5 })
  } catch (err) {
    console.error('[channelEngine] RAG error:', err.message)
  }

  const contextText = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
    : '(No se encontró contexto relevante en la base de conocimiento)'

  // Claude completion (non-streaming)
  let reply = 'No pude generar una respuesta en este momento. Por favor intenta de nuevo.'
  try {
    const response = await getAnthropic().messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     buildSystemPrompt(chatbot, contextText),
      messages:   [{ role: 'user', content: text }],
    })
    reply = response.content?.[0]?.text?.trim() || reply
  } catch (err) {
    console.error('[channelEngine] Anthropic error:', err.message)
  }

  // Persist assistant reply + update conversation timestamp
  await prisma.$transaction([
    prisma.conversationMessage.create({
      data: { conversationId, role: 'assistant', content: reply },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data:  { updatedAt: new Date() },
    }),
  ])

  return { reply, conversationId, escalated: false }
}
