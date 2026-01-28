import prisma from '../../../lib/prisma'
import { createHandler, success, notFound, noContent } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession, hasMinRole } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const { id } = req.query
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const contact = await prisma.contact.findFirst({
      where: { 
        id: parseInt(id),
        organizationId, // Ensure contact belongs to user's organization
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        deals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        tasks: {
          where: { status: { not: 'completed' } },
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { deals: true, tasks: true, activities: true }
        }
      }
    })
    
    if (!contact) return notFound(res, 'Contact not found')
    success(res, contact)
  },

  PUT: async (req, res) => {
    // Get session for audit and organizationId
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const { id } = req.query
    const contactId = parseInt(id)
    
    // Get existing contact for audit - ensure it belongs to the organization
    const existingContact = await prisma.contact.findFirst({ 
      where: { id: contactId, organizationId } 
    })
    if (!existingContact) return notFound(res, 'Contact not found')
    
    const { id: bodyId, ownerId, visibility, visibleTo, owner, deals, tasks, activities, _count, createdAt, updatedAt, organization, organizationId: bodyOrgId, ...rest } = req.body
    
    // Convert empty strings to null for optional fields
    const cleanData = Object.fromEntries(
      Object.entries(rest).map(([key, value]) => [key, value === '' ? null : value])
    )
    
    try {
      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: {
          ...cleanData,
          owner: ownerId !== undefined 
            ? (ownerId ? { connect: { id: parseInt(ownerId) } } : { disconnect: true })
            : undefined,
          visibility: visibility || undefined,
          visibleTo: visibleTo !== undefined ? JSON.stringify(visibleTo) : undefined,
          updatedBy: 'system',
        }
      })

      // Log the action
      await logAudit({
        action: AuditActions.UPDATED,
        entity: AuditEntities.CONTACT,
        entityId: contact.id,
        entityName: `${contact.firstName} ${contact.lastName}`,
        details: { changes: Object.keys(rest) },
        userId: session?.user?.id,
        userName: session?.user?.name,
        organizationId,
        req,
      })

      success(res, contact)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Contact not found')
      throw error
    }
  },

  DELETE: async (req, res) => {
    // Check authentication
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const organizationId = session.user.organizationId
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { id } = req.query
    const contactId = parseInt(id)
    
    // Get contact info for audit before deleting - ensure it belongs to the organization
    const contact = await prisma.contact.findFirst({ 
      where: { id: contactId, organizationId } 
    })
    if (!contact) return notFound(res, 'Contact not found')
    
    // Check permission: only owner, creator, or admin/manager can delete
    const isOwner = contact.ownerId === session.user.id
    const isCreator = contact.createdBy === session.user.name || contact.createdBy === session.user.email
    const isManagerOrAdmin = hasMinRole(session.user.role, 'manager')
    
    if (!isOwner && !isCreator && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este contacto' })
    }
    
    try {
      await prisma.contact.delete({
        where: { id: contactId }
      })

      // Log the deletion
      await logAudit({
        action: AuditActions.DELETED,
        entity: AuditEntities.CONTACT,
        entityId: contactId,
        entityName: `${contact.firstName} ${contact.lastName}`,
        details: { 
          email: contact.email,
          company: contact.company,
        },
        userId: session.user.id,
        userName: session.user.name,
        organizationId,
        req,
      })

      noContent(res)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Contact not found')
      throw error
    }
  },
}

export default createHandler(methods)
