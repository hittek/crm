import prisma from '../../../lib/prisma'
import { createHandler, success, created, parseFilters } from '../../../lib/api'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const { filters, sortBy, sortOrder, page, limit } = parseFilters(req.query)
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const where = {
      organizationId, // Filter by organization
    }
    
    if (filters.contactId) where.contactId = filters.contactId
    if (filters.dealId) where.dealId = filters.dealId

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        }
      }
    })

    const total = await prisma.activity.count({ where })

    success(res, {
      data: activities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  },

  POST: async (req, res) => {
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const activity = await prisma.activity.create({
      data: {
        ...req.body,
        organizationId,
        createdBy: 'system',
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        }
      }
    })
    
    // Auto-create follow-up task after logging activity (except notes)
    if (req.body.createFollowUp && req.body.type !== 'note') {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 3) // 3 days follow-up
      
      await prisma.task.create({
        data: {
          title: `Follow up: ${req.body.subject}`,
          type: req.body.type === 'call' ? 'call' : 'task',
          dueDate,
          contactId: req.body.contactId,
          dealId: req.body.dealId,
          organizationId,
          createdBy: 'system',
          updatedBy: 'system',
        }
      })
    }
    
    created(res, activity)
  },
}

export default createHandler(methods)
