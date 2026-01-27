import prisma from '../../../lib/prisma'
import { createHandler, success, created, parseFilters } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const { filters, sortBy, sortOrder, page, limit } = parseFilters(req.query)
    const { userId, showAll } = req.query // userId for visibility filtering
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const where = {
      organizationId, // Filter by organization
    }
    
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ]
    }
    
    if (filters.stage) where.stage = filters.stage
    if (filters.contactId) where.contactId = filters.contactId
    if (filters.priority) where.priority = filters.priority

    // Visibility filtering based on user
    if (userId && showAll !== 'true') {
      const currentUserId = parseInt(userId)
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { ownerId: currentUserId },
            { visibility: 'org' },
            { visibleTo: { contains: `${currentUserId}` } },
          ]
        }
      ]
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, company: true }
          },
          ownerUser: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { tasks: true, activities: true }
          }
        }
      }),
      prisma.deal.count({ where })
    ])

    success(res, {
      data: deals,
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
    
    const { ownerId, visibility, visibleTo, ...rest } = req.body
    const data = { ...rest }
    
    // Set default expected close date to 30 days out
    if (!data.expectedClose) {
      const date = new Date()
      date.setDate(date.getDate() + 30)
      data.expectedClose = date
    }
    
    data.organizationId = organizationId
    data.ownerId = ownerId ? parseInt(ownerId) : null
    data.visibility = visibility || 'org'
    data.visibleTo = visibleTo ? JSON.stringify(visibleTo) : null
    data.createdBy = 'system'
    data.updatedBy = 'system'
    
    const deal = await prisma.deal.create({
      data,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, company: true }
        },
        ownerUser: {
          select: { id: true, name: true }
        }
      }
    })

    // Log the action
    await logAudit({
      action: AuditActions.CREATED,
      entity: AuditEntities.DEAL,
      entityId: deal.id,
      entityName: deal.title,
      details: { 
        value: deal.value,
        stage: deal.stage,
        contact: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : null,
      },
      userId: session?.user?.id,
      userName: session?.user?.name,
      organizationId,
      req,
    })

    created(res, deal)
  },
}

export default createHandler(methods)
