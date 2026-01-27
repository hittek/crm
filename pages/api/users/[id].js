import prisma from '../../../lib/prisma'
import { createHandler, success, notFound } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession, hashPassword, hasMinRole } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
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
    
    // Ensure user belongs to the organization
    const user = await prisma.user.findFirst({
      where: { 
        id: parseInt(id),
        organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timezone: true,
        locale: true,
        isActive: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTasks: true,
            ownedContacts: true,
            ownedDeals: true,
          }
        }
      }
    })

    if (!user) {
      return notFound(res, 'Usuario no encontrado')
    }

    success(res, user)
  },

  PUT: async (req, res) => {
    // Only admins can update users
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (!hasMinRole(session.user.role, 'admin')) {
      return res.status(403).json({ error: 'No tienes permisos para modificar usuarios' })
    }
    
    const organizationId = session.user.organizationId
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { id } = req.query
    const userId = parseInt(id)
    
    // Ensure user belongs to the organization
    const existingUser = await prisma.user.findFirst({ 
      where: { id: userId, organizationId } 
    })
    if (!existingUser) {
      return notFound(res, 'Usuario no encontrado')
    }

    const { email, name, password, role, avatar, timezone, locale, isActive, preferences } = req.body

    // Check if email is being changed to one that already exists in this organization
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({ 
        where: { 
          email: email.toLowerCase().trim(),
          organizationId,
        } 
      })
      if (emailExists) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
      }
    }

    // Validate password if provided
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    // Check if we're trying to demote an admin or deactivate them
    if (existingUser.role === 'admin') {
      const wouldRemoveAdmin = (role !== undefined && role !== 'admin') || (isActive === false)
      if (wouldRemoveAdmin) {
        const adminCount = await prisma.user.count({
          where: {
            organizationId,
            role: 'admin',
            isActive: true,
          }
        })
        if (adminCount <= 1) {
          return res.status(400).json({ 
            error: 'No puedes quitar privilegios de administrador al último administrador. La organización debe tener al menos un administrador activo.' 
          })
        }
      }
    }

    const updateData = {}
    if (email !== undefined) updateData.email = email.toLowerCase().trim()
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (avatar !== undefined) updateData.avatar = avatar
    if (timezone !== undefined) updateData.timezone = timezone
    if (locale !== undefined) updateData.locale = locale
    if (isActive !== undefined) updateData.isActive = isActive
    if (preferences !== undefined) updateData.preferences = typeof preferences === 'string' ? preferences : JSON.stringify(preferences)
    
    // Hash password if provided
    if (password) {
      updateData.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // Log the action
    await logAudit({
      action: AuditActions.UPDATED,
      entity: AuditEntities.USER,
      entityId: user.id,
      entityName: user.name,
      details: { 
        changes: { ...updateData, password: password ? '[UPDATED]' : undefined },
        previousRole: existingUser.role,
        newRole: user.role,
      },
      userId: session.user.id,
      userName: session.user.name,
      organizationId,
      req,
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    success(res, userWithoutPassword)
  },

  DELETE: async (req, res) => {
    // Only admins can delete users
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (!hasMinRole(session.user.role, 'admin')) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar usuarios' })
    }
    
    const organizationId = session.user.organizationId
    if (!organizationId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const { id } = req.query
    const userId = parseInt(id)
    
    // Prevent deleting yourself
    if (userId === session.user.id) {
      return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' })
    }
    
    // Ensure user belongs to the organization
    const user = await prisma.user.findFirst({ 
      where: { id: userId, organizationId } 
    })
    if (!user) {
      return notFound(res, 'Usuario no encontrado')
    }

    // If the user being deleted is an admin, check if there's at least one other active admin
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({
        where: {
          organizationId,
          role: 'admin',
          isActive: true,
        }
      })
      if (adminCount <= 1) {
        return res.status(400).json({ 
          error: 'No puedes eliminar al último administrador. La organización debe tener al menos un administrador activo.' 
        })
      }
    }

    // Instead of deleting, deactivate the user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    })

    // Log the action
    await logAudit({
      action: AuditActions.DELETED,
      entity: AuditEntities.USER,
      entityId: userId,
      entityName: user.name,
      details: { email: user.email, deactivated: true },
      userId: session.user.id,
      userName: session.user.name,
      organizationId,
      req,
    })

    success(res, { message: 'Usuario desactivado correctamente' })
  },
}

export default createHandler(methods)
