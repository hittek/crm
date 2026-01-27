import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = global

const createPrismaClient = () => {
  return new PrismaClient().$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
