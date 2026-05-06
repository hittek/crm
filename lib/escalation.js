/**
 * Escalation intent detection.
 *
 * First tries a fast set of keyword heuristics. If the message doesn't match
 * any keyword but the chatbot has an escalationPhrase configured, falls back
 * to a lightweight Claude call to check semantic intent.
 *
 * Returns true if the user wants to talk to a human agent.
 */

// Common ways to request a human in Spanish and English
const ESCALATION_KEYWORDS = [
  // Spanish
  'hablar con', 'habla con', 'contactar', 'contáctame', 'contactame',
  'agente', 'humano', 'persona real', 'operador', 'asesor',
  'quiero hablar', 'necesito hablar', 'comunícame', 'comunícame',
  'transfiere', 'transfierme', 'transferir',
  // English
  'speak to', 'talk to', 'human agent', 'real person', 'live agent',
  'connect me', 'transfer me', 'speak with a', 'talk with a',
]

/**
 * Fast heuristic check — no API call.
 * Matches the configured phrase OR any of the keyword patterns.
 */
function heuristicEscalation(text, escalationPhrase) {
  const lower = text.toLowerCase()
  if (escalationPhrase && lower.includes(escalationPhrase.toLowerCase())) return true
  return ESCALATION_KEYWORDS.some(kw => lower.includes(kw))
}

/**
 * Semantic check via Claude when heuristic is inconclusive.
 * Skipped in test environments (saves tokens + avoids latency in CI).
 * Very cheap: single-token yes/no answer.
 */
async function semanticEscalation(text) {
  // Skip Claude call during tests — heuristic coverage is sufficient for test phrases
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_SEMANTIC_ESCALATION === '1') {
    return false
  }
  try {
    const Anthropic = eval('require')('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{
        role:    'user',
        content: `Does the following customer message express a desire to speak with a human agent or customer support representative? Answer only "yes" or "no".\n\nMessage: "${text}"`,
      }],
    })
    const answer = response.content?.[0]?.text?.trim().toLowerCase() || ''
    return answer.startsWith('yes') || answer === 'sí' || answer === 'si'
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
  // Fast path: heuristic match → no API call needed
  if (heuristicEscalation(text, escalationPhrase)) return true
  // Slow path: ambiguous message → ask Claude
  return semanticEscalation(text)
}
