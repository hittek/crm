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
    
    const task = await prisma.task.findFirst({
      where: { 
        id: parseInt(id),
        organizationId, // Ensure task belongs to user's organization
      },
      include: {
        contact: true,
        deal: true,
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        ownerUser: {
          select: { id: true, name: true }
        }
      }
    })
    
    if (!task) return notFound(res, 'Task not found')
    success(res, task)
  },

  PUT: async (req, res) => {
    // Get session for audit and organizationId
    const session = await getSession(req, res)
    const organizationId = session?.user?.organizationId
    
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    const { id } = req.query
    const taskId = parseInt(id)
    
    // Get existing task for audit logging - ensure it belongs to the organization
    const existingTask = await prisma.task.findFirst({ 
      where: { id: taskId, organizationId },
      include: { assignedTo: { select: { name: true } } }
    })
    if (!existingTask) return notFound(res, 'Task not found')
    
    const { assignedToId, ownerId, ...rest } = req.body
    const data = { ...rest, updatedBy: 'system' }
    
    // Handle user assignments
    if (assignedToId !== undefined) {
      data.assignedToId = assignedToId ? parseInt(assignedToId) : null
    }
    if (ownerId !== undefined) {
      data.ownerId = ownerId ? parseInt(ownerId) : null
    }
    
    // If marking as completed, set completedAt
    if (data.status === 'completed' && !data.completedAt) {
      data.completedAt = new Date()
    }
    
    try {
      const task = await prisma.task.update({
        where: { id: taskId },
        data,
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
      
      // Create activity if task completed
      if (data.status === 'completed') {
        await prisma.activity.create({
          data: {
            type: 'task_completed',
            subject: `Task completed: ${task.title}`,
            contactId: task.contactId,
            dealId: task.dealId,
            organizationId,
            createdBy: 'system',
          }
        })
        
        // Log completion
        await logAudit({
          action: AuditActions.COMPLETED,
          entity: AuditEntities.TASK,
          entityId: task.id,
          entityName: task.title,
          details: { completedAt: task.completedAt },
          userId: session?.user?.id,
          userName: session?.user?.name,
          organizationId,
          req,
        })
      } else if (assignedToId !== undefined && assignedToId !== existingTask.assignedToId) {
        // Log assignment change
        await logAudit({
          action: AuditActions.ASSIGNED,
          entity: AuditEntities.TASK,
          entityId: task.id,
          entityName: task.title,
          details: { 
            previousAssignee: existingTask.assignedTo?.name,
            newAssignee: task.assignedTo?.name,
          },
          userId: session?.user?.id,
          userName: session?.user?.name,
          organizationId,
          req,
        })
      } else {
        // Log general update
        await logAudit({
          action: AuditActions.UPDATED,
          entity: AuditEntities.TASK,
          entityId: task.id,
          entityName: task.title,
          details: { changes: Object.keys(data) },
          userId: session?.user?.id,
          userName: session?.user?.name,
          organizationId,
          req,
        })
      }
      
      success(res, task)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Task not found')
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
    const taskId = parseInt(id)
    
    // Get task info for audit log before deleting - ensure it belongs to the organization
    const task = await prisma.task.findFirst({ 
      where: { id: taskId, organizationId } 
    })
    if (!task) return notFound(res, 'Task not found')
    
    // Check permission: only owner, assignee, creator, or admin/manager can delete
    const isOwner = task.ownerId === session.user.id
    const isAssignee = task.assignedToId === session.user.id
    const isCreator = task.createdBy === session.user.name || task.createdBy === session.user.email
    const isManagerOrAdmin = hasMinRole(session.user.role, 'manager')
    
    if (!isOwner && !isAssignee && !isCreator && !isManagerOrAdmin) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar esta tarea' })
    }
    
    try {
      await prisma.task.delete({ where: { id: taskId } })
      
      // Log the deletion
      await logAudit({
        action: AuditActions.DELETED,
        entity: AuditEntities.TASK,
        entityId: taskId,
        entityName: task.title,
        details: { 
          type: task.type,
          status: task.status,
          deletedAt: new Date().toISOString(),
        },
        userId: session.user.id,
        userName: session.user.name,
        organizationId,
        req,
      })
      
      noContent(res)
    } catch (error) {
      if (error.code === 'P2025') return notFound(res, 'Task not found')
      throw error
    }
  },
}

export default createHandler(methods)
