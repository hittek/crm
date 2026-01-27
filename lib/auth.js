import { getIronSession } from 'iron-session'
import bcrypt from 'bcryptjs'

// Session configuration
export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'crm_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

// Get session from request/response
export async function getSession(req, res) {
  return await getIronSession(req, res, sessionOptions)
}

// Password hashing
const SALT_ROUNDS = 10

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword)
}

// Role hierarchy for RBAC
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  user: 1,
}

// Check if user has minimum required role
export function hasMinRole(userRole, requiredRole) {
  return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

// Middleware to require authentication
export function requireAuth(handler) {
  return async (req, res) => {
    const session = await getSession(req, res)
    
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    req.user = session.user
    return handler(req, res)
  }
}

// Middleware to require specific role
export function requireRole(requiredRole) {
  return (handler) => {
    return async (req, res) => {
      const session = await getSession(req, res)
      
      if (!session.user) {
        return res.status(401).json({ error: 'No autenticado' })
      }
      
      if (!hasMinRole(session.user.role, requiredRole)) {
        return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' })
      }
      
      req.user = session.user
      return handler(req, res)
    }
  }
}

// Create handler with authentication check
export function createProtectedHandler(methods, options = {}) {
  const { requireRole: requiredRole = null } = options
  
  return async function handler(req, res) {
    const session = await getSession(req, res)
    
    // Check authentication
    if (!session.user) {
      return res.status(401).json({ error: 'No autenticado' })
    }
    
    // Check role if required
    if (requiredRole && !hasMinRole(session.user.role, requiredRole)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' })
    }
    
    req.user = session.user
    
    const method = methods[req.method]
    if (method) {
      try {
        await method(req, res)
      } catch (error) {
        console.error(error)
        return res.status(500).json({ error: 'Error interno del servidor' })
      }
    } else {
      res.setHeader('Allow', Object.keys(methods))
      res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  }
}

// Permission checks for specific actions
export const permissions = {
  // Settings permissions
  canManageSettings: (user) => hasMinRole(user?.role, 'admin'),
  canManageUsers: (user) => hasMinRole(user?.role, 'admin'),
  canViewAllData: (user) => hasMinRole(user?.role, 'manager'),
  
  // Task permissions
  canAssignTasks: (user) => hasMinRole(user?.role, 'manager'),
  
  // Check if user can access a specific resource
  canAccessResource: (user, resource) => {
    if (!user || !resource) return false
    
    // Admins and managers can see everything
    if (hasMinRole(user.role, 'manager')) return true
    
    // Users can only see their own or public resources
    if (resource.visibility === 'org') return true
    if (resource.ownerId === user.id) return true
    if (resource.assignedToId === user.id) return true
    
    // Check visibleTo array
    if (resource.visibleTo) {
      try {
        const visibleToIds = JSON.parse(resource.visibleTo)
        if (visibleToIds.includes(user.id)) return true
      } catch (e) {
        // Invalid JSON, deny access
      }
    }
    
    return false
  },
}
