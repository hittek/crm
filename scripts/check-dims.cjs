require('dotenv').config()

async function main() {
  const { PrismaClient } = require('@prisma/client')
  const { PrismaPg } = require('@prisma/adapter-pg')
  const { Pool } = require('pg')

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  const total    = await prisma.knowledgeBaseChunk.count()
  const embedded = await prisma.knowledgeBaseChunk.count({ where: { embedded: true } })

  const sample = await prisma.$queryRawUnsafe(
    `SELECT id, array_length(embedding::real[], 1) AS dims
     FROM "KnowledgeBaseChunk" WHERE embedded = true LIMIT 1`
  )
  const colType = await prisma.$queryRawUnsafe(
    `SELECT format_type(a.atttypid, a.atttypmod) AS col_type
     FROM pg_attribute a JOIN pg_class c ON a.attrelid=c.oid
     WHERE c.relname='KnowledgeBaseChunk' AND a.attname='embedding'`
  )

  console.log(JSON.stringify({ total, embedded, sampleDims: sample[0]?.dims ?? 'none', colType: colType[0]?.col_type }))
  await prisma.$disconnect()
  pool.end()
}
main().catch(e => { console.error(e.message); process.exit(1) })
