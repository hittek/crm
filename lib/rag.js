/**
 * RAG search using pgvector cosine similarity.
 *
 * SPENDING GUARD SUMMARY
 * ─────────────────────
 * • searchChunks() → exactly 1 Voyage call (embed query) + 1 SQL query.
 *   No loops, no retries.
 * • Only returns chunks that have been embedded (embedded = true).
 */

import { embedTexts } from './embeddings.js'
import prisma from './prisma.js'

const DEFAULT_LIMIT = 5

/**
 * Find the most relevant chunks for a query string.
 *
 * @param {{ query: string, kbId: number, orgId: number, limit?: number }}
 * @returns {Promise<Array<{ id, content, chunkIndex, documentId, distance }>>}
 */
export async function searchChunks({ query, kbId, orgId, limit = DEFAULT_LIMIT }) {
  if (!query?.trim()) return []

  // 1 Voyage call — embed the query
  const [queryVec] = await embedTexts([query])

  // 1 SQL query — cosine distance (<=>), nearest neighbours
  const pgVector = `[${queryVec.join(',')}]`

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, "documentId", "kbId", "chunkIndex", content,
            embedding <=> $1::vector AS distance
     FROM "KnowledgeBaseChunk"
     WHERE "kbId" = $2
       AND "orgId" = $3
       AND embedded = true
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    pgVector,
    kbId,
    orgId,
    limit,
  )

  return rows
}
