/**
 * Reindex all KnowledgeBaseChunks with the current embedding model.
 * Batches up to 100 chunks per Voyage API call (hard cap in embedTexts).
 * Run once after changing the embedding model / vector dimension.
 *
 * Usage:  node scripts/reindex-embeddings.cjs
 */
require('dotenv').config()
require('dotenv').config({ path: '.env.local', override: true })

const MAX_BATCH = 100

async function main() {
  const { PrismaClient } = require('@prisma/client')
  const { PrismaPg } = require('@prisma/adapter-pg')
  const { Pool } = require('pg')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Voyage embed helper (inline — avoids ESM import issues in .cjs)
  const VOYAGE_URL   = 'https://api.voyageai.com/v1/embeddings'
  const VOYAGE_MODEL = 'voyage-4-lite'
  const VOYAGE_KEY   = process.env.VOYAGE_API_KEY
  if (!VOYAGE_KEY) throw new Error('VOYAGE_API_KEY not set')

  async function embedBatch(texts) {
    const resp = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${VOYAGE_KEY}` },
      body: JSON.stringify({ input: texts, model: VOYAGE_MODEL }),
    })
    if (!resp.ok) {
      const body = await resp.text().catch(() => '')
      throw new Error(`Voyage ${resp.status}: ${body.slice(0, 200)}`)
    }
    const data = await resp.json()
    return data.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
  }

  // Load all un-embedded chunks
  const chunks = await prisma.knowledgeBaseChunk.findMany({
    where: { embedded: false },
    select: { id: true, content: true },
    orderBy: { id: 'asc' },
  })

  if (chunks.length === 0) {
    console.log('Nothing to reindex — all chunks already embedded.')
    await prisma.$disconnect(); pool.end(); return
  }

  console.log(`Reindexing ${chunks.length} chunks with ${VOYAGE_MODEL}…`)

  let done = 0
  for (let i = 0; i < chunks.length; i += MAX_BATCH) {
    const batch = chunks.slice(i, i + MAX_BATCH)
    const vectors = await embedBatch(batch.map(c => c.content))

    for (let j = 0; j < batch.length; j++) {
      const pgVec = `[${vectors[j].join(',')}]`
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeBaseChunk" SET embedding = $1::vector, embedded = true WHERE id = $2`,
        pgVec,
        batch[j].id,
      )
    }

    done += batch.length
    console.log(`  ${done}/${chunks.length} chunks embedded`)
  }

  console.log(`Done. ${done} chunks reindexed.`)
  await prisma.$disconnect()
  pool.end()
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
