/**
 * Simple text chunker for knowledge base documents.
 * Splits on sentence/paragraph boundaries, targeting ~400 tokens per chunk
 * (≈1600 chars). Overlaps 80 chars for context continuity.
 */

const CHUNK_SIZE = 1600   // chars ≈ 400 tokens
const OVERLAP    = 80     // chars

/**
 * Split text into overlapping chunks.
 * @param {string} text
 * @returns {{ content: string, chunkIndex: number, tokenCount: number }[]}
 */
export function chunkText(text) {
  if (!text || text.trim().length === 0) return []

  // Normalise whitespace while preserving paragraph breaks
  const normalised = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const chunks = []
  let start = 0

  while (start < normalised.length) {
    let end = Math.min(start + CHUNK_SIZE, normalised.length)

    // Try to break at a sentence boundary (. ! ?) or paragraph (\n\n)
    if (end < normalised.length) {
      const window = normalised.slice(start, end + 200)
      const paraBreak = window.lastIndexOf('\n\n')
      const sentBreak = Math.max(
        window.lastIndexOf('. '),
        window.lastIndexOf('! '),
        window.lastIndexOf('? '),
      )

      if (paraBreak > CHUNK_SIZE * 0.5) {
        end = start + paraBreak + 2
      } else if (sentBreak > CHUNK_SIZE * 0.5) {
        end = start + sentBreak + 2
      }
    }

    const content = normalised.slice(start, end).trim()
    if (content.length > 0) {
      chunks.push({
        content,
        chunkIndex: chunks.length,
        tokenCount: Math.ceil(content.length / 4), // rough estimate: 4 chars ≈ 1 token
      })
    }

    start = end - OVERLAP
    // If we just processed the final character, or start didn't advance
    // (end === normalised.length keeps start = normalised.length - OVERLAP,
    // causing an infinite loop), stop here.
    if (end >= normalised.length || start <= 0) break
  }

  return chunks
}

/**
 * Build chunks for a Q&A pair — treated as one self-contained chunk.
 */
export function chunkQA(question, answer) {
  const content = `Q: ${question.trim()}\nA: ${answer.trim()}`
  return [{
    content,
    chunkIndex: 0,
    tokenCount: Math.ceil(content.length / 4),
  }]
}
