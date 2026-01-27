// Jest setup file
import '@testing-library/jest-dom'

// Default mock user for authenticated requests
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  organizationId: 1,
}

// Mock session object with save and destroy methods
const mockSession = {
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    organizationId: 1,
  },
  save: jest.fn(() => Promise.resolve()),
  destroy: jest.fn(() => Promise.resolve()),
}

// Mock authentication module
jest.mock('./lib/auth', () => ({
  __esModule: true,
  getSession: jest.fn(() => Promise.resolve(mockSession)),
  hasMinRole: jest.fn((userRole, requiredRole) => {
    const ROLE_HIERARCHY = { admin: 3, manager: 2, user: 1 }
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
  }),
  hashPassword: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  verifyPassword: jest.fn(() => Promise.resolve(true)),
  requireAuth: jest.fn((handler) => handler),
  requireRole: jest.fn(() => (handler) => handler),
  createProtectedHandler: jest.fn((methods) => async (req, res) => {
    const method = methods[req.method]
    if (method) {
      await method(req, res)
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  }),
}))

// Mock audit logging
jest.mock('./lib/audit', () => ({
  __esModule: true,
  logAudit: jest.fn(() => Promise.resolve()),
  AuditActions: {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    COMPLETED: 'completed',
    STAGE_CHANGED: 'stage_changed',
    ASSIGNED: 'assigned',
    STATUS_CHANGED: 'status_changed',
  },
  AuditEntities: {
    CONTACT: 'contact',
    DEAL: 'deal',
    TASK: 'task',
    USER: 'user',
    SETTINGS: 'settings',
  },
}))

// Mock Prisma client
jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: {
    contact: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    deal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    activity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))
