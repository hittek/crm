import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'
import path from 'path'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    // Use SQLite for local development
    url: env('DATABASE_URL') || `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`,
  },
})
        