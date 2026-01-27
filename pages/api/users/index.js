import prisma from '../../../lib/prisma'
import { createHandler, success, created, parseFilters } from '../../../lib/api'
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

    const { filters, sortBy, sortOrder, page, limit } = parseFilters(req.query)
    const { activeOnly } = req.query
    
    const where = {
      organizationId, // Filter by organization
    }
    
    if (activeOnly === 'true') {
      where.isActive = true
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { email: { contains: filters.search } },
      ]
    }
    
    if (filters.role) {
      where.role = filters.role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy || 'name']: sortOrder || 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          timezone: true,
          locale: true,
          isActive: true,
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
      }),
      prisma.user.count({ where })
    ])

    success(res, {
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  },

  POST: async (req, res) => {
    // Only admins can create users
    const session = await getSession(req, res)
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    if (!hasMinRole(session.user.role, 'admin')) {
      return res.status(403).json({ error: 'No tienes permisos para crear usuarios' })
    }

    const { email, name, password, role, avatar, timezone, locale, isActive } = req.body

    if (!email || !name) {
      return res.status(400).json({ error: 'Email y nombre son requeridos' })
    }

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es requerida' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    // Check if email already exists in this organization
    const existingUser = await prisma.user.findFirst({ 
      where: { 
        email: email.toLowerCase().trim(),
        organizationId: session.user.organizationId,
      } 
    })
    if (existingUser) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
    }

    // Hash the password
    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name,
        role: role || 'user',
        avatar,
        timezone: timezone || 'America/Mexico_City',
        locale: locale || 'es-MX',
        isActive: isActive !== false,
        organizationId: session.user.organizationId,
      }
    })

    // Log the action
    await logAudit({
      action: AuditActions.CREATED,
      entity: AuditEntities.USER,
      entityId: user.id,
      entityName: user.name,
      details: { email: user.email, role: user.role },
      userId: session.user.id,
      userName: session.user.name,
      organizationId: session.user.organizationId,
      req,
    })

    // Return user without password
    const { password: _, ...userWithoutPassword } = user
    created(res, userWithoutPassword)
  },
}

export default createHandler(methods)
