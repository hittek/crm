import prisma from '../../../lib/prisma'
import { createHandler, success, notFound, noContent } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession, hasMinRole } from '../../../lib/auth'
import { notifications } from '../../../lib/notifications'

const methods = {
  GET: async (req, res) => {
    const { id } = req.query
    
    // Get organizationId from session
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const deal = await prisma.deal.findFirst({
      where: { 
        id: parseInt(id),
        organizationId, // Ensure deal belongs to user's organization
      },
      include: {
        contact: true,
        ownerUser: {
          select: { id: true, name: true, email: true }
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      }
    })
    
    if (!deal) return notFound(res, 'Deal not found')
    success(res, deal)
  },

  PUT: async (req, res) => {
    // Get session for audit and organizationId
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const { id } = req.query
    const dealId = parseInt(id)
    
    // Get existing deal for audit logging - ensure it belongs to the organization
    const existingDeal = await prisma.deal.findFirst({ 
      where: { id: dealId, organizationId } 
    })
    if (!existingDeal) return notFound(res, 'Deal not found')
    
    const { ownerId, visibility, visibleTo, ...rest } = req.body
    const data = { ...rest, updatedBy: 'system' }
    
    // Handle user assignments
    if (ownerId !== undefined) {
      data.ownerId = ownerId ? parseInt(ownerId) : null
    }
    if (visibility !== undefined) {
      data.visibility = visibility
    }
    if (visibleTo !== undefined) {
      data.visibleTo = JSON.stringify(visibleTo)
    }
    
    // If stage changed to won/lost, set actual close date
    if (data.stage === 'won' || data.stage === 'lost') {
      if (!data.actualClose) data.actualClose = new Date()
    }
    
    try {
      const deal = await prisma.deal.update({
        where: { id: dealId },
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
      
      // Create activity and log for stage change
      if (req.body.stage && req.body.stage !== existingDeal.stage) {
        await prisma.activity.create({
          data: {
            type: 'deal_updated',
            subject: `Deal moved to ${req.body.stage}`,
            dealId: dealId,
            contactId: deal.contactId,
            organizationId,
            createdBy: 'system',
          }
        })

        // Log stage change
        await logAudit({
          action: AuditActions.STAGE_CHANGED,
          entity: AuditEntities.DEAL,
          entityId: deal.id,
          entityName: deal.title,
          details: { 
            previousStage: existingDeal.stage,
            newStage: deal.stage,
            contact: deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName}` : null,
          },
          userId: session?.user?.id,
          userName: session?.user?.name,
          organizationId,
          req,
        })

        // Send notifications for won/lost deals
        if (deal.stage === 'won') {
          notifications.dealWon(deal, organizationId, session?.user?.id).catch(console.error)
        } else if (deal.stage === 'lost') {
          notifications.dealLost(deal, organizationId, session?.user?.id).catch(console.error)
        }
      } else {
        // Log general update
        await logAudit({
          action: AuditActions.UPDATED,
          entity: AuditEntities.DEAL,
          entityId: deal.id,
          entityName: deal.title,
          details: { changes: Object.keys(rest) },
          userId: session?.user?.id,
          userName: session?.user?.name,
          organizationId,
          req,
        })
      }
      
      success(res, deal)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Deal not found')
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
    const dealId = parseInt(id)
    
    // Get deal info for audit before deleting - ensure it belongs to the organization
    const deal = await prisma.deal.findFirst({ 
      where: { id: dealId, organizationId } 
    })
    if (!deal) return notFound(res, 'Deal not found')
    
    // Check permission: only owner, creator, or admin/manager can delete
    const isOwner = deal.ownerId === session.user.id
    const isCreator = deal.createdBy === session.user.name || deal.createdBy === session.user.email
    const isManagerOrAdmin = hasMinRole(session.user.role, 'manager')
    
    if (!isOwner && !isCreator && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este negocio' })
    }
    
    try {
      await prisma.deal.delete({ where: { id: dealId } })

      // Log the deletion
      await logAudit({
        action: AuditActions.DELETED,
        entity: AuditEntities.DEAL,
        entityId: dealId,
        entityName: deal.title,
        details: { 
          value: deal.value,
          stage: deal.stage,
        },
        userId: session.user.id,
        userName: session.user.name,
        organizationId,
        req,
      })

      noContent(res)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Deal not found')
      throw error
    }
  },
}

export default createHandler(methods)
