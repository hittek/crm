import prisma from '../../../lib/prisma'
import { createHandler, success, parseFilters } from '../../../lib/api'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const { filters, page, limit } = parseFilters(req.query)
    const { entity, entityId, userId, action, startDate, endDate } = req.query
    
    const where = {
      organizationId, // Filter by organization
    }
    
    if (entity) where.entity = entity
    if (entityId) where.entityId = parseInt(entityId)
    if (userId) where.userId = parseInt(userId)
    if (action) where.action = action
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    if (filters.search) {
      where.OR = [
        { entityName: { contains: filters.search } },
        { userName: { contains: filters.search } },
      ]
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, avatar: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ])

    // Parse the details JSON for each log
    const parsedLogs = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }))

    success(res, {
      data: parsedLogs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  },
}

export default createHandler(methods)
