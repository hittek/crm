import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// Environment variables
const accelerateUrl = process.env.PRISMA_DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'

// Determine which provider to use
const isPostgres = 
  accelerateUrl || 
  databaseUrl.startsWith('postgres://') || 
  databaseUrl.startsWith('postgresql://')

const datasourceConfig = isPostgres
  ? {
      provider: 'postgresql',
      url: accelerateUrl || databaseUrl,
    }
  : {
      provider: 'sqlite', 
      url: databaseUrl,
    }

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: datasourceConfig,
})
        