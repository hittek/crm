import prisma from '../../../lib/prisma'
import { createHandler, success } from '../../../lib/api'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'
import { getSession, hashPassword } from '../../../lib/auth'

const methods = {
  GET: async (req, res) => {
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timezone: true,
        locale: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    success(res, user)
  },

  PUT: async (req, res) => {
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const userId = session.user.id
    const organizationId = session.user.organizationId

    const existingUser = await prisma.user.findUnique({ 
      where: { id: userId } 
    })
    
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    const { name, currentPassword, newPassword, avatar, timezone, locale, preferences } = req.body

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Debes proporcionar tu contraseña actual' })
      }
      
      // Verify current password
      const bcrypt = require('bcryptjs')
      const isValidPassword = await bcrypt.compare(currentPassword, existingUser.password)
      
      if (!isValidPassword) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' })
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
      }
    }

    const updateData = {}
    if (name !== undefined && name.trim()) updateData.name = name.trim()
    if (avatar !== undefined) updateData.avatar = avatar
    if (timezone !== undefined) updateData.timezone = timezone
    if (locale !== undefined) updateData.locale = locale
    if (preferences !== undefined) {
      updateData.preferences = typeof preferences === 'string' 
        ? preferences 
        : JSON.stringify(preferences)
    }
    
    // Hash new password if provided
    if (newPassword) {
      updateData.password = await hashPassword(newPassword)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        timezone: true,
        locale: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    // Log the action
    await logAudit({
      action: AuditActions.UPDATED,
      entity: AuditEntities.USER,
      entityId: user.id,
      entityName: user.name,
      details: { 
        changes: { 
          ...updateData, 
          password: newPassword ? '[UPDATED]' : undefined 
        },
        selfUpdate: true,
      },
      userId: session.user.id,
      userName: session.user.name,
      organizationId,
      req,
    })

    success(res, user)
  },
}

export default createHandler(methods)
