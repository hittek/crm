/**
 * lib/summarize.js
 *
 * Generates a short AI summary when a conversation resolves.
 * Stores it on `Conversation.summary` and appends to `Contact.aiSummary`
 * so future conversations have context about the customer.
 *
 * Call pattern: fire-and-forget (don't await in hot paths).
 *   summarizeConversation(convId).catch(() => {})
 */
import prisma from './prisma.js'

const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 150

function getAnthropic() {
  // eval('require') bypasses webpack bundling of server-only packages
  const Anthropic = eval('require')('@anthropic-ai/sdk') // eslint-disable-line no-eval
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

/**
 * Summarise a conversation and persist the result.
 *
 * @param {number} conversationId
 * @returns {Promise<string|null>} the generated summary, or null on failure
 */
export async function summarizeConversation(conversationId) {
  try {
    const conv = await prisma.conversation.findUnique({
      where:   { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 60 },
        contact:  true,
      },
    })
    if (!conv) return null

    // Need at least one user + one AI exchange to be worth summarising
    const userMessages = conv.messages.filter(m => m.role === 'user')
    if (userMessages.length < 1) return null

    // Build a compact transcript
    const transcript = conv.messages
      .filter(m => ['user', 'assistant', 'agent'].includes(m.role))
      .map(m => {
        const speaker = m.role === 'user' ? 'Cliente' : 'Soporte'
        return `${speaker}: ${m.content.slice(0, 400)}`
      })
      .join('\n')

    let summary = null
    try {
      const res = await getAnthropic().messages.create({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{
          role:    'user',
          content: `Resume esta conversación de soporte en 2-3 oraciones concisas. ` +
                   `Incluye: el problema principal del cliente, cómo fue resuelto (o si quedó pendiente), ` +
                   `y cualquier dato relevante. Solo texto plano, sin formato markdown.\n\n` +
                   `Conversación:\n${transcript}`,
        }],
      })
      summary = res.content?.[0]?.text?.trim() || null
    } catch (err) {
      console.error('[summarize] Anthropic error:', err.message)
      return null
    }

    if (!summary) return null

    // Persist on conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { summary },
    })

    // If a contact is linked, append to their aiSummary (most recent first, capped at 3000 chars)
    if (conv.contactId) {
      const contact = conv.contact ?? await prisma.contact.findUnique({ where: { id: conv.contactId } })
      if (contact) {
        const date    = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
        const newLine = `[${date}] ${summary}`
        const updated = contact.aiSummary
          ? `${newLine}\n\n${contact.aiSummary}`.slice(0, 3000)
          : newLine
        await prisma.contact.update({
          where: { id: conv.contactId },
          data:  { aiSummary: updated },
        })
      }
    }

    console.log(`[summarize] conv ${conversationId} summarised (${summary.length} chars)`)
    return summary

  } catch (err) {
    console.error(`[summarize] conv ${conversationId} failed:`, err.message)
    return null
  }
}
