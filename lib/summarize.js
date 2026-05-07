/**
 * lib/summarize.js
 *
 * Generates/updates a customer profile when a conversation resolves.
 *
 * Per conversation:
 *   1. Summarise the resolved conversation (2-3 sentences → conv.summary)
 *   2. If a contact is linked, merge that summary into contact.aiSummary
 *      using a second small Claude call so the profile stays compact
 *      regardless of how many sessions the customer has had.
 *
 * The contact profile is NOT a log — it's a maintained 3-4 sentence
 * description of the customer that gets updated in place each time.
 *
 * Call pattern: fire-and-forget (don't await in hot paths).
 *   summarizeConversation(convId).catch(() => {})
 */
import prisma from './prisma.js'

const MODEL      = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 200

function getAnthropic() {
  // eval('require') bypasses webpack bundling of server-only packages
  const Anthropic = eval('require')('@anthropic-ai/sdk') // eslint-disable-line no-eval
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

async function callClaude(prompt) {
  const res = await getAnthropic().messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    messages:   [{ role: 'user', content: prompt }],
  })
  return res.content?.[0]?.text?.trim() ?? null
}

/**
 * Summarise a conversation and update the linked contact's profile.
 *
 * @param {number} conversationId
 * @returns {Promise<string|null>} the conversation summary, or null on failure
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

    // Need at least one user message to be worth summarising
    if (!conv.messages.some(m => m.role === 'user')) return null

    // Build a compact transcript (truncate long messages)
    const transcript = conv.messages
      .filter(m => ['user', 'assistant', 'agent'].includes(m.role))
      .map(m => `${m.role === 'user' ? 'Cliente' : 'Soporte'}: ${m.content.slice(0, 400)}`)
      .join('\n')

    // ── Step 1: summarise this conversation ───────────────────────────────
    let summary = null
    try {
      summary = await callClaude(
        `Resume esta conversación de soporte en 2-3 oraciones concisas. ` +
        `Incluye: el problema principal, cómo fue resuelto (o si quedó pendiente), ` +
        `y cualquier dato relevante del cliente. Solo texto plano.\n\n` +
        `Conversación:\n${transcript}`,
      )
    } catch (err) {
      console.error('[summarize] conversation summary failed:', err.message)
      return null
    }

    if (!summary) return null

    // Persist on the conversation row
    await prisma.conversation.update({
      where: { id: conversationId },
      data:  { summary },
    })

    // ── Step 2: merge into contact profile (if linked) ────────────────────
    if (conv.contactId) {
      const contact = conv.contact
        ?? await prisma.contact.findUnique({ where: { id: conv.contactId } })

      if (contact) {
        let newProfile = null
        try {
          if (contact.aiSummary) {
            // Merge: update the existing profile rather than appending
            newProfile = await callClaude(
              `Tienes un perfil existente de un cliente de soporte y el resumen de su conversación más reciente. ` +
              `Actualiza el perfil del cliente incorporando la nueva información. ` +
              `El perfil debe tener máximo 4 oraciones y reflejar el estado actual del cliente ` +
              `(sus problemas recurrentes, lo que ya se resolvió, preferencias o datos clave). ` +
              `Solo texto plano, sin fechas, sin formato markdown.\n\n` +
              `Perfil actual:\n${contact.aiSummary}\n\n` +
              `Conversación reciente:\n${summary}`,
            )
          } else {
            // First conversation — the summary becomes the initial profile
            newProfile = summary
          }
        } catch (err) {
          console.error('[summarize] profile merge failed:', err.message)
          // Fall back to using the summary directly
          newProfile = summary
        }

        if (newProfile) {
          await prisma.contact.update({
            where: { id: conv.contactId },
            data:  { aiSummary: newProfile.slice(0, 1000) }, // hard cap: 1000 chars
          })
        }
      }
    }

    console.log(`[summarize] conv ${conversationId} done (summary: ${summary.length} chars)`)
    return summary

  } catch (err) {
    console.error(`[summarize] conv ${conversationId} failed:`, err.message)
    return null
  }
}
