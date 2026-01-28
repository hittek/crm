import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

function createPrismaClient() {
  const accelerateUrl = process.env.PRISMA_DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db'
  
  // 1. Production with Accelerate (PRISMA_DATABASE_URL is set)
  if (accelerateUrl) {
    console.log('Using Prisma Accelerate (PostgreSQL)')
    const client = new PrismaClient({
      accelerateUrl,
    })
    try {
      const { withAccelerate } = require('@prisma/extension-accelerate')
      return client.$extends(withAccelerate())
    } catch {
      return client
    }
  }
  
  // 2. Local PostgreSQL (DATABASE_URL starts with postgres://)
  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    console.log('Using direct PostgreSQL connection')
    return new PrismaClient({
      log: ['warn', 'error'],
    })
  }
  
  // 3. Local SQLite (DATABASE_URL starts with file:)
  console.log('Using SQLite with LibSQL adapter')
  try {
    const { PrismaLibSQL } = require('@prisma/adapter-libsql')
    const { createClient } = require('@libsql/client')
    
    const libsql = createClient({ url: databaseUrl })
    const adapter = new PrismaLibSQL(libsql)
    
    return new PrismaClient({
      adapter,
      log: ['warn', 'error'],
    })
  } catch (error) {
    console.warn('LibSQL adapter not available, falling back to standard client:', error.message)
    return new PrismaClient({
      log: ['warn', 'error'],
    })
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
