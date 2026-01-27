
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const methods = {
  GET: async (req, res) => {
    const customers = await prisma.customer.findMany()
    res.json(customers)
  },
  POST: async (req, res) => {
    const customer = await prisma.customer.create({ data: req.body })
    res.json(customer)
  },
}

export default async function handler(req, res) {
  const method = methods[req.method]
  if (method) {
    try {
      await method(req, res)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Internal Server Error' })
    }
  } else {
    res.setHeader('Allow', Object.keys(methods))
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
