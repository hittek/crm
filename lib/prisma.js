import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis

function createPrismaClient() {
  // Use Accelerate URL in production (Vercel), direct connection locally
  const accelerateUrl = process.env.PRISMA_DATABASE_URL
  
  if (accelerateUrl) {
    // Production: Use Accelerate for connection pooling
    return new PrismaClient({
      datasources: { db: { url: accelerateUrl } },
    }).$extends(withAccelerate())
  }
  
  // Local development: Direct connection without Accelerate
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances during hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
