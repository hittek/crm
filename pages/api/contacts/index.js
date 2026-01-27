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
        { firstName: { contains: filters.search } },
        { lastName: { contains: filters.search } },
        { email: { contains: filters.search } },
        { company: { contains: filters.search } },
        { phone: { contains: filters.search } },
      ]
    }
    
    if (filters.status) where.status = filters.status
    if (filters.tags) where.tags = { contains: filters.tags }

    // Visibility filtering based on user
    if (userId && showAll !== 'true') {
      const currentUserId = parseInt(userId)
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { ownerId: currentUserId },
            { visibility: 'org' },
            // Check if user is in visibleTo JSON array
            { visibleTo: { contains: `${currentUserId}` } },
          ]
        }
      ]
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          _count: {
            select: { deals: true, tasks: true, activities: true }
          }
        }
      }),
      prisma.contact.count({ where })
    ])

    success(res, {
      contacts: contacts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
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
    
    const contact = await prisma.contact.create({
      data: {
        ...rest,
        organizationId,
        ownerId: ownerId ? parseInt(ownerId) : null,
        visibility: visibility || 'org',
        visibleTo: visibleTo ? JSON.stringify(visibleTo) : null,
        createdBy: 'system',
        updatedBy: 'system',
      },
      include: {
        owner: {
          select: { id: true, name: true }
        }
      }
    })

    // Log the action
    await logAudit({
      action: AuditActions.CREATED,
      entity: AuditEntities.CONTACT,
      entityId: contact.id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      details: { 
        email: contact.email,
        company: contact.company,
      },
      userId: session?.user?.id,
      userName: session?.user?.name,
      organizationId,
      req,
    })

    created(res, contact)
  },
}

export default createHandler(methods)
