/**
 * Voyage AI embedding helper.
 *
 * SPENDING GUARD SUMMARY
 * ─────────────────────
 * • embedTexts()  → exactly 1 HTTP request per call (no retry, no loop).
 *   Caller is responsible for batching. Max input = MAX_TEXTS = 100.
 * • No background polling, no automatic re-embedding.
 * • Throws on API error — caller marks document as 'error', stops.
 */

const VOYAGE_URL   = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3-lite'   // 512 dims, free tier 50M tok/mo
const MAX_TEXTS    = 100               // hard cap: >100 inputs = programmer error

/**
 * Embed an array of strings in a single Voyage API call.
 * Returns float[] arrays in the same order as input.
 * Throws on any error — no retries.
 *
 * @param {string[]} texts
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts) {
  if (!texts || texts.length === 0) return []

  // Hard cap — prevents runaway spending if caller has a bug
  if (texts.length > MAX_TEXTS) {
    throw new Error(`embedTexts: input length ${texts.length} exceeds MAX_TEXTS (${MAX_TEXTS})`)
  }

  const key = process.env.VOYAGE_API_KEY
  if (!key) throw new Error('VOYAGE_API_KEY not set')

  const resp = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    throw new Error(`Voyage API error ${resp.status}: ${body.slice(0, 200)}`)
  }

  const data = await resp.json()

  if (!data.data || data.data.length !== texts.length) {
    throw new Error(`Voyage returned ${data.data?.length} embeddings for ${texts.length} inputs`)
  }

  // Return embeddings in input order (Voyage preserves order)
  return data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding)
}
