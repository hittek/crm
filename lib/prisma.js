import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const accelerateUrl = process.env.PRISMA_DATABASE_URL
  
  // Production with Accelerate (PostgreSQL)
  if (accelerateUrl) {
    return new PrismaClient().$extends(withAccelerate())
  }
  
  // Local development with SQLite
  if (databaseUrl.startsWith('file:')) {
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
    const adapter = new PrismaBetterSqlite3({ url: databaseUrl })
    
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  
  // Fallback error
  throw new Error('DATABASE_URL must be a SQLite file:// URL for local dev, or set PRISMA_DATABASE_URL for Accelerate')
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances during hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
