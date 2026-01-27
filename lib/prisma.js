import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis

const createPrismaClient = () => {
  // Use Accelerate URL in production, fallback to direct connection locally
  const dbUrl = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL
  return new PrismaClient({
    accelerateUrl: dbUrl,
  }).$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
