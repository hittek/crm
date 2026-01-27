import prisma from '../../../lib/prisma'
import { createHandler, success, created, parseFilters } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const { filters, sortBy, sortOrder, page, limit } = parseFilters(req.query)
    const { filter, userId, showAll } = req.query // userId = current user for visibility filtering
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const where = {
      organizationId, // Filter by organization
    }
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1)
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    if (filter === 'today') {
      where.dueDate = { gte: startOfToday, lte: endOfToday }
      where.status = { not: 'completed' }
    } else if (filter === 'upcoming') {
      where.dueDate = { gt: endOfToday, lte: endOfWeek }
      where.status = { not: 'completed' }
    } else if (filter === 'overdue') {
      where.dueDate = { lt: startOfToday }
      where.status = { not: 'completed' }
    } else if (filter === 'completed') {
      where.status = 'completed'
    }
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ]
    }
    
    if (filters.contactId) where.contactId = filters.contactId
    if (filters.dealId) where.dealId = filters.dealId
    if (filters.priority) where.priority = filters.priority
    if (filters.status) where.status = filters.status

    // Visibility filtering based on user role
    // If userId provided and showAll is not true, filter by visibility
    if (userId && showAll !== 'true') {
      const currentUserId = parseInt(userId)
      // Show tasks that are: assigned to user, owned by user, or have org visibility
      where.OR = [
        ...(where.OR || []),
        { assignedToId: currentUserId },
        { ownerId: currentUserId },
        { visibility: 'org' },
      ]
    }

    const [tasks, total, counts] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: sortBy === 'dueDate' ? [{ dueDate: sortOrder }, { priority: 'desc' }] : { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true }
          },
          deal: {
            select: { id: true, title: true }
          },
          assignedTo: {
            select: { id: true, name: true, email: true, avatar: true }
          },
          ownerUser: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.task.count({ where }),
      // Get counts for filters - also filtered by organization
      Promise.all([
        prisma.task.count({ where: { organizationId, dueDate: { gte: startOfToday, lte: endOfToday }, status: { not: 'completed' } } }),
        prisma.task.count({ where: { organizationId, dueDate: { gt: endOfToday, lte: endOfWeek }, status: { not: 'completed' } } }),
        prisma.task.count({ where: { organizationId, dueDate: { lt: startOfToday }, status: { not: 'completed' } } }),
      ])
    ])

    success(res, {
      data: tasks,
      counts: {
        today: counts[0],
        upcoming: counts[1],
        overdue: counts[2],
      },
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  },

  POST: async (req, res) => {
    // Get session for audit and organizationId
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const { assignedToId, ownerId, visibility, ...rest } = req.body
    
    const task = await prisma.task.create({
      data: {
        ...rest,
        organizationId,
        assignedToId: assignedToId ? parseInt(assignedToId) : null,
        ownerId: ownerId ? parseInt(ownerId) : null,
        visibility: visibility || 'org',
        createdBy: 'system',
        updatedBy: 'system',
      },
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true }
        },
        deal: {
          select: { id: true, title: true }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // Log the action
    await logAudit({
      action: AuditActions.CREATED,
      entity: AuditEntities.TASK,
      entityId: task.id,
      entityName: task.title,
      details: { 
        type: task.type,
        assignedTo: task.assignedTo?.name,
        dueDate: task.dueDate,
      },
      userId: session?.user?.id,
      userName: session?.user?.name,
      organizationId,
      req,
    })

    created(res, task)
  },
}

export default createHandler(methods)
