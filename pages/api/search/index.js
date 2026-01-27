import prisma from '../../../lib/prisma'
import { createHandler, success } from '../../../lib/api'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const { q } = req.query
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    if (!q || q.length < 2) {
      return success(res, { contacts: [], deals: [], tasks: [] })
    }

    const [contacts, deals, tasks] = await Promise.all([
      prisma.contact.findMany({
        where: {
          organizationId,
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { company: { contains: q } },
            { phone: { contains: q } },
          ]
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
        }
      }),
      prisma.deal.findMany({
        where: {
          organizationId,
          OR: [
            { title: { contains: q } },
            { id: parseInt(q) || 0 ? { equals: parseInt(q) } : undefined },
          ].filter(Boolean)
        },
        take: 5,
        select: {
          id: true,
          title: true,
          value: true,
          stage: true,
          contact: {
            select: { firstName: true, lastName: true }
          }
        }
      }),
      prisma.task.findMany({
        where: {
          organizationId,
          title: { contains: q },
          status: { not: 'completed' }
        },
        take: 5,
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
        }
      }),
    ])

    success(res, { contacts, deals, tasks })
  },
}

export default createHandler(methods)
