/**
 * Escalation intent detection.
 *
 * First tries a fast set of keyword heuristics. If the message doesn't match
 * any keyword but the chatbot has an escalationPhrase configured, falls back
 * to a lightweight Claude call to check semantic intent.
 *
 * Returns true if the user explicitly wants to talk to a human agent.
 */

import Anthropic from '@anthropic-ai/sdk'

// Keywords that unambiguously signal "I want a human" in Spanish/English.
// Deliberately narrow — product/pricing questions must NOT appear here.
const ESCALATION_KEYWORDS = [
  // Spanish — explicit human transfer requests
  'hablar con', 'habla con', 'hablar con un',
  'quiero hablar', 'necesito hablar', 'quiero un agente', 'quiero un asesor',
  'quiero hablar con alguien', 'quiero una persona',
  'comunícame con', 'comunícame con un',
  'conéctame con', 'transfiere', 'transfierme',
  'hablar con una persona', 'hablar con alguien',
  'persona real', 'ser humano', 'humano real',
  // English — explicit human transfer requests
  'speak to a human', 'talk to a human', 'speak to an agent', 'talk to an agent',
  'human agent', 'real person', 'live agent', 'live support',
  'connect me to', 'transfer me to', 'speak with a human', 'talk with a human',
]

// Keywords that are unambiguously NOT escalation — quote/product inquiries.
// When these appear, skip the semantic check entirely.
const PRODUCT_INQUIRY_KEYWORDS = [
  // Spanish
  'cotizar', 'cotización', 'precio', 'costo', 'cuánto cuesta', 'cuanto cuesta',
  'cuánto vale', 'cuanto vale', 'cuánto son', 'cuanto son',
  'me interesa', 'quisiera', 'quiero comprar', 'quiero pedir', 'quiero ordenar',
  'información sobre', 'informacion sobre', 'más información', 'mas informacion',
  'disponible', 'disponibilidad', 'catálogo', 'catalogo', 'producto', 'servicio',
  'medidas', 'tamaño', 'tamanio', 'modelo',
  // English
  'quote', 'pricing', 'how much', 'cost of', 'price of', 'buy', 'order',
  'availability', 'in stock', 'product', 'service', 'catalog',
]

/**
 * Fast heuristic check — no API call.
 * Returns 'escalate' | 'skip' | 'ambiguous'.
 */
function heuristicCheck(text, escalationPhrase) {
  const lower = text.toLowerCase()

  // Configured phrase is always an exact escalation signal
  if (escalationPhrase && lower.includes(escalationPhrase.toLowerCase())) return 'escalate'

  // Explicit escalation keywords
  if (ESCALATION_KEYWORDS.some(kw => lower.includes(kw))) return 'escalate'

  // Product/pricing inquiry — skip semantic check, let the bot handle it
  if (PRODUCT_INQUIRY_KEYWORDS.some(kw => lower.includes(kw))) return 'skip'

  return 'ambiguous'
}

/**
 * Semantic check via Claude when heuristic is inconclusive.
 * Skipped in test environments (saves tokens + avoids latency in CI).
 * Very cheap: single-token yes/no answer.
 *
 * Prompt is deliberately strict: only returns yes for EXPLICIT human requests,
 * never for product questions, complaints, or general support queries.
 */
async function semanticEscalation(text) {
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_SEMANTIC_ESCALATION === '1') {
    return false
  }
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{
        role:    'user',
        content: `Is the customer explicitly asking to be transferred to or speak with a human agent right now? ` +
                 `Answer "yes" ONLY if they are directly requesting a human (e.g. "speak to an agent", "I want a person"). ` +
                 `Answer "no" for product questions, complaints, quote requests, pricing inquiries, or general help — ` +
                 `even if frustrated. Answer only "yes" or "no".\n\nMessage: "${text}"`,
      }],
    })
    const answer = response.content?.[0]?.text?.trim().toLowerCase() || ''
    return answer.startsWith('yes')
  } catch (err) {
    console.error('[escalation] semantic check failed:', err.message)
    return false
  }
}

/**
 * Main export. Call this before running RAG.
 *
 * @param {string} text               - User's message
 * @param {string|null} escalationPhrase - The chatbot's configured phrase (can be null)
 * @returns {Promise<boolean>}
 */
export async function shouldEscalate(text, escalationPhrase) {
  const result = heuristicCheck(text, escalationPhrase)
  if (result === 'escalate') return true
  if (result === 'skip')     return false
  // Ambiguous — ask Claude only if escalationPhrase is set (bot intends to support escalation)
  if (!escalationPhrase) return false
  return semanticEscalation(text)
}
