import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

function createPrismaClient() {
  const accelerateUrl = process.env.PRISMA_DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  
  // Production with Accelerate (PRISMA_DATABASE_URL is set)
  if (accelerateUrl) {
    console.log('Using Prisma Accelerate (PostgreSQL)')
    const { withAccelerate } = require('@prisma/extension-accelerate')
    return new PrismaClient({
      accelerateUrl,
    }).$extends(withAccelerate())
  }
  
  // Local PostgreSQL with direct connection
  console.log('Using direct PostgreSQL connection')
  const { PrismaPg } = require('@prisma/adapter-pg')
  const { Pool } = require('pg')
  
  const pool = new Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  
  return new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
