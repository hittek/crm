import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis

function createPrismaClient() {
  // Vercel sets PRISMA_DATABASE_URL to the Accelerate URL automatically
  const accelerateUrl = process.env.PRISMA_DATABASE_URL
  
  if (accelerateUrl) {
    // Production: Use Accelerate for connection pooling
    return new PrismaClient({
      accelerateUrl: accelerateUrl,
    }).$extends(withAccelerate())
  }
  
  // Local development: Direct connection (uses DATABASE_URL from schema/config)
  return new PrismaClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Prevent multiple instances during hot reload in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
