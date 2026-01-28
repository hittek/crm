import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    provider: 'postgresql',
    url: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL,
  },
})
        