/**
 * Channel engine — shared non-streaming RAG + Claude processing.
 *
 * Used by all channel webhook handlers (Telegram, WhatsApp, Facebook).
 * The sandbox ChatPanel uses the streaming endpoint directly.
 *
 * processMessage({ chatbot, channel, sessionId, userMessage, metadata?, phoneNumber? })
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
 *
 * Cross-session memory
 * ────────────────────
 * When a new conversation is created for a known sessionId, the most recent
 * resolved conversation's summary (or last few messages) is injected into the
 * system prompt so the AI has context about the customer's history.
 *
 * Contact linking
 * ────────────────
 * WhatsApp sessionIds carry the phone number (wa-{phone}). On new conversation
 * creation we attempt to match the phone against a CRM Contact and set
 * contactId on the Conversation. If the Contact has an aiSummary from prior
 * conversations it is also injected into the system prompt.
 *
 * Auto-resolve
 * ─────────────
 * Claude is instructed to append [RESOLVED] to its reply when the conversation
 * has reached a natural conclusion. The marker is stripped before sending to
 * the user. The conversation is then marked resolved and a summary is generated
 * async.
 */
import prisma           from './prisma.js'
import { searchChunks } from './rag.js'
import { shouldEscalate } from './escalation.js'
import { summarizeConversation } from './summarize.js'
import { getEnabledTools, executeToolCall } from './chatbotTools.js'

const MODEL         = 'claude-haiku-4-5-20251001'
const MAX_TOKENS    = 512
/** Number of prior assistant↔user exchange pairs to include in context. */
const HISTORY_TURNS = 6

function getAnthropic() {
  const Anthropic = eval('require')('@anthropic-ai/sdk') // eslint-disable-line no-eval
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

export function buildSystemPrompt(chatbot, contextText, { prevSummary, contactContext, enabledTools, channel } = {}) {
  const botName = chatbot?.name || 'Asistente'
  const hasProductTools = enabledTools?.some(t => t === 'lookup_products' || t === 'create_quote')

  const sections = [
    `Eres ${botName}, un asistente virtual.`,
    hasProductTools
      ? `Para preguntas de soporte y políticas, usa el contexto de la base de conocimiento. Para precios y cotizaciones, usa las herramientas disponibles — NO digas que no tienes información, búscala con lookup_products.`
      : `Responde usando únicamente el siguiente contexto. Si la respuesta no está en el contexto, dilo claramente.`,
    `Sé conciso y directo. Responde en el mismo idioma que el usuario.`,
    `No uses formato markdown: sin asteriscos, sin almohadillas, sin guiones como viñetas. Solo texto plano con saltos de línea cuando sea necesario.`,
    `Si el problema del usuario ha quedado completamente resuelto y la conversación ha llegado a una conclusión natural (el usuario agradeció, confirmó que está resuelto, o se despidió), añade exactamente "[RESOLVED]" en una línea nueva al final de tu respuesta. No lo incluyas si la conversación podría continuar.`,
  ]

  // Tool-use hints — helps Claude know when and how to use its tools
  if (enabledTools?.length) {
    const hints = []
    if (enabledTools.includes('lookup_products') || enabledTools.includes('create_quote')) {
      hints.push('Para precios o cotizaciones: llama lookup_products con el nombre del producto. Luego llama create_quote con los precios del catálogo. SIEMPRE usa estas herramientas para cualquier pregunta de precios — nunca digas que no tienes esa información.')
    }
    if (enabledTools.includes('create_contact')) {
      const channelHint = channel === 'whatsapp'
        ? 'El teléfono ya está disponible desde WhatsApp — no lo pidas. Solo necesitas el nombre si no lo conoces.'
        : channel === 'telegram' || channel === 'facebook'
          ? 'El nombre ya está disponible desde el perfil del canal — no lo pidas. Puedes pedir correo o empresa si es relevante.'
          : 'Cuando el usuario proporcione su nombre y/o teléfono/email, llama create_contact para registrarlo.'
      hints.push(`CREAR CONTACTO: ${channelHint} Llama create_contact en cuanto tengas suficiente información.`)
    }
    if (hints.length) {
      sections.push(`\nHERRAMIENTAS DISPONIBLES:\n${hints.join('\n')}`)
    }
  }

  if (contactContext) {
    sections.push(`\nCONTEXTO DEL CLIENTE:\n${contactContext}`)
  }

  if (prevSummary) {
    sections.push(`\nHISTORIAL PREVIO DE ESTE USUARIO:\n${prevSummary}`)
  }

  sections.push(`\nCONTEXTO DE SOPORTE:\n${contextText}`)

  return sections.join('\n')
}

// ── Conversation history → Claude messages array ───────────────────────────────

async function loadHistory(conversationId) {
  const rows = await prisma.conversationMessage.findMany({
    where:   { conversationId, role: { in: ['user', 'assistant'] } },
    orderBy: { createdAt: 'desc' },
    take:    HISTORY_TURNS * 2,
  })
  rows.reverse()
  return rows.map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))
}

// ── Cross-session memory ───────────────────────────────────────────────────────

/**
 * Load context from the most recent resolved conversation for this session.
 * Returns the stored summary if available, otherwise the last few message pairs
 * as a compact text block.
 */
async function loadPrevSessionContext(chatbotId, sessionId, channel) {
  const prev = await prisma.conversation.findFirst({
    where:   { chatbotId, sessionId, channel, status: 'resolved' },
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

  // Prefer the stored summary — it's compact and curated
  if (prev.summary) return prev.summary

  // Fallback: reconstruct from last messages
  if (prev.messages.length === 0) return null
  prev.messages.reverse()
  return prev.messages
    .map(m => `${m.role === 'user' ? 'Cliente' : 'Soporte'}: ${m.content.slice(0, 200)}`)
    .join('\n')
}

// ── Contact linking ────────────────────────────────────────────────────────────

/**
 * Try to match the conversation to a CRM Contact.
 * Currently works for WhatsApp (phone number in sessionId as "wa-{digits}").
 * Returns the full contact object if found, null otherwise.
 */
async function findContactId(orgId, channel, sessionId) {
  if (channel !== 'whatsapp') return null

  const rawPhone = sessionId.replace(/^wa-/, '')
  if (!rawPhone || rawPhone.length < 7) return null

  const digits = rawPhone.replace(/\D/g, '')

  const contact = await prisma.contact.findFirst({
    where: {
      organizationId: orgId,
      OR: [
        { phone:  { contains: digits.slice(-10) } },
        { mobile: { contains: digits.slice(-10) } },
      ],
    },
    select: { id: true, aiSummary: true, firstName: true, lastName: true },
  })
  return contact ?? null
}

/**
 * Auto-create a Contact when none was found and `autoCreateContact` is enabled.
 * Uses the phone number from a WhatsApp sessionId as the primary identifier.
 * Returns the new contact id or null.
 */
async function autoCreateContact(orgId, channel, sessionId) {
  if (channel !== 'whatsapp') return null

  const rawPhone = sessionId.replace(/^wa-/, '')
  if (!rawPhone || rawPhone.length < 7) return null
  const digits = rawPhone.replace(/\D/g, '')

  try {
    const contact = await prisma.contact.create({
      data: {
        organizationId: orgId,
        firstName:      'WhatsApp',
        lastName:       digits.slice(-10),
        phone:          `+${digits}`,
        source:         'chatbot',
        status:         'lead',
      },
      select: { id: true, aiSummary: true, firstName: true, lastName: true },
    })
    console.log(`[channelEngine] auto-created contact ${contact.id} for ${channel} session`)
    return contact
  } catch (err) {
    // Duplicate key race condition — try to find it
    if (err.code === 'P2002') {
      return findContactId(orgId, channel, sessionId)
    }
    console.error('[channelEngine] autoCreateContact failed:', err.message)
    return null
  }
}

/**
 * Auto-create a Deal linked to a contact if none exists for this chatbot engagement.
 * Only runs when `chatbot.autoCreateDeal` is true.
 */
async function autoCreateDeal(orgId, contactId, chatbot, channel) {
  // Check if there's already an open deal for this contact from this chatbot's org
  const existing = await prisma.deal.findFirst({
    where: {
      organizationId: orgId,
      contactId,
      stage: { notIn: ['won', 'lost'] },
    },
    select: { id: true },
  })
  if (existing) return existing.id

  const stage    = chatbot.defaultDealStage || 'lead'
  const template = chatbot.dealTitleTemplate || 'Consulta vía {channel}'
  const title    = template.replace('{channel}', channel).replace('{name}', chatbot.name)

  try {
    const deal = await prisma.deal.create({
      data: {
        organizationId: orgId,
        contactId,
        title,
        stage,
        value:  0,
      },
      select: { id: true },
    })
    console.log(`[channelEngine] auto-created deal ${deal.id} for contact ${contactId}`)
    return deal.id
  } catch (err) {
    console.error('[channelEngine] autoCreateDeal failed:', err.message)
    return null
  }
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {object} opts.chatbot      - Full chatbot record
 * @param {string} opts.channel      - 'telegram' | 'whatsapp' | 'facebook'
 * @param {string} opts.sessionId    - Platform-stable identifier
 * @param {string} opts.userMessage  - Raw text from the end user
 * @param {object} [opts.metadata]   - Extra data stored on the conversation
 *
 * @returns {{ reply: string|null, conversationId: number, escalated: boolean, isNew: boolean, handedOff: boolean }}
 */

// ── Chatbot activity logger ────────────────────────────────────────────────────

/**
 * Fire-and-forget: log a chatbot conversation as a CRM Activity on the linked Contact.
 * Called after conversation status changes to resolved or escalated.
 */
export async function logConversationActivity(conversationId, { orgId, contactId, outcome, channel, chatbotName = null }) {
  if (!contactId) return // no linked contact → nothing to log

  try {
    const msgCount = await prisma.conversationMessage.count({
      where: { conversationId, role: 'user' },
    })

    const conv = await prisma.conversation.findUnique({
      where:  { id: conversationId },
      select: { createdAt: true, updatedAt: true },
    })

    const durationMin = conv
      ? Math.max(1, Math.round((new Date(conv.updatedAt) - new Date(conv.createdAt)) / 60000))
      : null

    const CHANNEL_LABELS = {
      web: 'Web', whatsapp: 'WhatsApp', telegram: 'Telegram', facebook: 'Facebook', sandbox: 'Sandbox',
    }
    const channelLabel = CHANNEL_LABELS[channel] || channel

    await prisma.activity.create({
      data: {
        organizationId: orgId,
        contactId,
        type:     'chatbot_conversation',
        subject:  `Conversación vía ${channelLabel}`,
        content:  `${msgCount} mensaje${msgCount !== 1 ? 's' : ''} del usuario`,
        outcome,
        duration: durationMin,
        metadata: JSON.stringify({ conversationId, channel, chatbotName }),
        createdBy: 'chatbot',
      },
    })
  } catch (err) {
    console.error('[channelEngine] logChatbotActivity failed:', err.message)
  }
}

export async function processMessage({ chatbot, channel, sessionId, userMessage, metadata }) {
  const { id: chatbotId, orgId, kbId } = chatbot
  const text = userMessage.trim()

  // ── Reset command (/new, /start, etc.) ────────────────────────────────────
  if (isResetCommand(text)) {
    await prisma.conversation.updateMany({
      where: { chatbotId, sessionId, channel, status: { in: ['open', 'escalated'] } },
      data:  { status: 'resolved', updatedAt: new Date() },
    })
    const greeting = chatbot.greeting || '¡Hola! ¿En qué puedo ayudarte hoy?'
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
    include: { contact: { select: { aiSummary: true, firstName: true, lastName: true } } },
  })
  const isNew = !conv
  let prevSummary  = null
  let contactMatch = null

  if (!conv) {
    // --- Cross-session memory: load context from most recent resolved conv ---
    prevSummary = await loadPrevSessionContext(chatbotId, sessionId, channel)

    // --- Contact linking (WhatsApp phone matching) ---
    contactMatch = await findContactId(orgId, channel, sessionId)

    // --- Auto-create contact if enabled and no match found ---
    if (!contactMatch && chatbot.autoCreateContact) {
      contactMatch = await autoCreateContact(orgId, channel, sessionId)
    }

    conv = await prisma.conversation.create({
      data: {
        chatbotId,
        orgId,
        sessionId,
        channel,
        status:    'open',
        contactId: contactMatch?.id ?? null,
        metadata:  metadata ? JSON.stringify(metadata) : undefined,
      },
      include: { contact: { select: { aiSummary: true, firstName: true, lastName: true } } },
    })

    // --- Auto-create deal if enabled and contact is linked ---
    if (chatbot.autoCreateDeal && contactMatch?.id) {
      autoCreateDeal(orgId, contactMatch.id, chatbot, channel).catch(err =>
        console.error('[channelEngine] autoCreateDeal failed:', err.message)
      )
    }
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
    logConversationActivity(conversationId, {
      orgId,
      contactId: conv.contactId ?? null,
      outcome:   'escalated',
      channel,
      chatbotName: chatbot.name,
    }).catch(() => {})
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

  // ── Build system prompt with memory context ───────────────────────────────
  const contactContext = conv.contact?.aiSummary
    ? `${conv.contact.firstName ?? ''} ${conv.contact.lastName ?? ''}: ${conv.contact.aiSummary}`.trim()
    : null

  // Compute enabled tool names for system prompt hints
  const enabledToolNames = (chatbot.enabledTools || '').split(',').map(t => t.trim()).filter(Boolean)
  if (enabledToolNames.includes('create_quote') && !enabledToolNames.includes('lookup_products')) {
    enabledToolNames.push('lookup_products')
  }

  const systemPrompt = buildSystemPrompt(chatbot, contextText, {
    prevSummary:    prevSummary,
    contactContext: contactContext,
    enabledTools:   enabledToolNames,
    channel,
  })

  // ── Conversation history ──────────────────────────────────────────────────
  const priorMessages   = await loadHistory(conversationId)
  const historyMessages = priorMessages.slice(0, -1) // drop the user msg we just saved

  // ── Claude completion with optional tool-use loop ────────────────────────
  const tools       = getEnabledTools(chatbot)
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx'
  const toolContext = { orgId, conversationId, contactId: conv.contactId ?? null, appUrl, imageAttachments: [], channel, metadata }
  let rawReply = 'No pude generar una respuesta en este momento. Por favor intenta de nuevo.'

  try {
    const apiParams = {
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      system:     systemPrompt,
      messages:   [
        ...historyMessages,
        { role: 'user', content: text },
      ],
    }
    if (tools.length > 0) {
      apiParams.tools = tools
    }

    let response = await getAnthropic().messages.create(apiParams)

    // Tool-use loop: Claude may call one or more tools before generating a reply
    // We allow up to 3 tool calls per user message to avoid runaway loops
    let toolIterations = 0
    while (response.stop_reason === 'tool_use' && toolIterations < 3) {
      toolIterations++
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
      const toolResults   = []

      for (const block of toolUseBlocks) {
        const result = await executeToolCall(block.name, block.input, toolContext)

        // If create_contact succeeded, update context so create_quote can link it
        if (block.name === 'create_contact' && result.ok && result.data?.contactId) {
          const newContactId = result.data.contactId
          toolContext.contactId = newContactId
          // Link to conversation in DB
          await prisma.conversation.update({
            where: { id: conversationId },
            data:  { contactId: newContactId },
          }).catch(() => {})
          // Auto-create deal for new contacts when feature is enabled
          if (chatbot.autoCreateDeal && !result.data.existing) {
            autoCreateDeal(orgId, newContactId, chatbot, channel)
              .then(dealId => { if (dealId) toolContext.dealId = dealId })
              .catch(err => console.error('[channelEngine] autoCreateDeal via tool failed:', err.message))
          }
        }

        // Collect product images for channel delivery (Telegram/WhatsApp)
        if (block.name === 'lookup_products' && result.ok && result.data?.products) {
          for (const p of result.data.products) {
            if (p.imageUrl) {
              toolContext.imageAttachments.push({ url: p.imageUrl, caption: p.name })
            }
          }
        }

        toolResults.push({
          type:         'tool_result',
          tool_use_id:  block.id,
          content:      result.message,
        })
      }

      // Continue the conversation with tool results
      apiParams.messages = [
        ...apiParams.messages,
        { role: 'assistant', content: response.content },
        { role: 'user',      content: toolResults },
      ]
      response = await getAnthropic().messages.create(apiParams)
    }

    const textBlock = response.content.find(b => b.type === 'text')
    rawReply = textBlock?.text?.trim() || rawReply

  } catch (err) {
    console.error('[channelEngine] Anthropic error:', err.message)
  }

  // ── Auto-resolve detection ────────────────────────────────────────────────
  const autoResolved = rawReply.includes('[RESOLVED]')
  const reply        = rawReply.replace(/\n?\[RESOLVED\]\s*$/, '').trim()

  // ── Persist assistant reply ───────────────────────────────────────────────
  const updates = [
    prisma.conversationMessage.create({
      data: { conversationId, role: 'assistant', content: reply },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data:  { updatedAt: new Date() },
    }),
  ]

  if (autoResolved) {
    updates.push(
      prisma.conversation.update({
        where: { id: conversationId },
        data:  { status: 'resolved' },
      }),
    )
  }

  await prisma.$transaction(updates)

  // Async fire-and-forget tasks (no user-facing latency)
  if (autoResolved) {
    summarizeConversation(conversationId).catch(err =>
      console.error('[channelEngine] summarize failed:', err.message)
    )
    logConversationActivity(conversationId, {
      orgId,
      contactId: conv.contactId ?? null,
      outcome:   'resolved',
      channel,
      chatbotName: chatbot.name,
    }).catch(() => {})
  }

  return { reply, conversationId, escalated: false, isNew, handedOff: false, autoResolved, imageAttachments: toolContext.imageAttachments }
}
