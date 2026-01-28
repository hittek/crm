import prisma from '../../../lib/prisma'
import { createHandler, success, created, parseFilters } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession } from '../../../lib/auth'
import { notifications } from '../../../lib/notifications'

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
    
    // Destructure to exclude relation fields and id that shouldn't be in create data
    const { id, ownerId, visibility, visibleTo, owner, deals, tasks, activities, _count, createdAt, updatedAt, organization, organizationId: bodyOrgId, ...rest } = req.body
    
    // Convert empty strings to null for optional fields (especially email for unique constraint)
    const cleanData = Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, value === '' ? null : value])
    )
    
    // Check for duplicate email manually (SQLite doesn't handle NULL in unique constraints well)
    if (cleanData.email) {
      const existingContact = await prisma.contact.findFirst({
        where: { email: cleanData.email, organizationId }
      })
      if (existingContact) {
        return res.status(409).json({ 
          error: 'Ya existe un contacto con este email',
          field: 'email'
        })
      }
    }
    
    // Remove email from data if null to avoid SQLite unique constraint issues
    if (cleanData.email === null) {
      delete cleanData.email
    }
    
    try {
      const contact = await prisma.contact.create({
        data: {
          ...cleanData,
          organizationId,
          owner: ownerId ? { connect: { id: parseInt(ownerId) } } : undefined,
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

      // Send notification about new contact to org (excludes creator)
      notifications.newContact(contact, session?.user?.id, organizationId).catch(console.error)

      created(res, contact)
    } catch (error) {
      // Handle unique constraint violation (duplicate email)
      if (error.code === 'P2002') {
        return res.status(409).json({ 
          error: 'Ya existe un contacto con este email',
          field: 'email'
        })
      }
      throw error
    }
  },
}

export default createHandler(methods)
