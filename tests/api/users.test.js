import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/users/index'
import prisma from '../../lib/prisma'

describe('/api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return users with pagination', async () => {
      const mockUsers = [
        { 
          id: 1, 
          email: 'admin@example.com', 
          name: 'Admin User',
          role: 'admin',
          isActive: true,
          createdAt: new Date(),
          _count: { assignedTasks: 5 }
        },
        { 
          id: 2, 
          email: 'user@example.com', 
          name: 'Regular User',
          role: 'user',
          isActive: true,
          createdAt: new Date(),
          _count: { assignedTasks: 10 }
        },
      ]

      prisma.user.findMany.mockResolvedValue(mockUsers)
      prisma.user.count.mockResolvedValue(2)

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.data).toHaveLength(2)
      expect(data.pagination.total).toBe(2)
    })

    it('should filter by organizationId from session', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        })
      )
    })

    it('should filter active users only', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { activeOnly: 'true' },
      })

      await handler(req, res)

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        })
      )
    })

    it('should search users by name or email', async () => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { search: 'admin' },
      })

      await handler(req, res)

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'admin' } }),
              expect.objectContaining({ email: { contains: 'admin' } }),
            ]),
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        role: 'user',
      }

      const createdUser = { 
        id: 3, 
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        isActive: true,
        organizationId: 1,
      }
      prisma.user.findFirst.mockResolvedValue(null) // No existing user with that email
      prisma.user.create.mockResolvedValue(createdUser)

      const { req, res } = createMocks({
        method: 'POST',
        body: newUser,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.email).toBe('new@example.com')
    })

    it('should set organizationId from session on new user', async () => {
      const newUser = {
        email: 'new@example.com',
        name: 'New User',
        password: 'password123',
        role: 'user',
      }

      prisma.user.findFirst.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: 3, ...newUser, organizationId: 1 })

      const { req, res } = createMocks({
        method: 'POST',
        body: newUser,
      })

      await handler(req, res)

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 1,
          }),
        })
      )
    })
  })
})

// Tests for [id].js endpoint
import idHandler from '../../pages/api/users/[id]'

describe('/api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DELETE - Last Admin Protection', () => {
    it('should prevent deleting the last admin', async () => {
      // User to delete is an admin
      prisma.user.findFirst.mockResolvedValue({
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
        role: 'admin',
        isActive: true,
        organizationId: 1,
      })
      // Only 1 active admin in the organization
      prisma.user.count.mockResolvedValue(1)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '2' },
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('último administrador')
    })

    it('should allow deleting an admin if there are other admins', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
        role: 'admin',
        isActive: true,
        organizationId: 1,
      })
      // 2 active admins in the organization
      prisma.user.count.mockResolvedValue(2)
      prisma.user.update.mockResolvedValue({ id: 2, isActive: false })

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '2' },
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.user.update).toHaveBeenCalled()
    })

    it('should allow deleting non-admin users without checking admin count', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 3,
        email: 'user@example.com',
        name: 'Regular User',
        role: 'user',
        isActive: true,
        organizationId: 1,
      })
      prisma.user.update.mockResolvedValue({ id: 3, isActive: false })

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '3' },
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      // Should not check admin count for non-admin users
      expect(prisma.user.count).not.toHaveBeenCalled()
    })
  })

  describe('PUT - Last Admin Protection', () => {
    it('should prevent demoting the last admin', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        isActive: true,
        organizationId: 1,
      })
      // Only 1 active admin
      prisma.user.count.mockResolvedValue(1)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { role: 'user' }, // Trying to demote to user
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('último administrador')
    })

    it('should prevent deactivating the last admin', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        isActive: true,
        organizationId: 1,
      })
      // Only 1 active admin
      prisma.user.count.mockResolvedValue(1)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { isActive: false }, // Trying to deactivate
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toContain('último administrador')
    })

    it('should allow demoting admin if there are other admins', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: 2,
        email: 'admin2@example.com',
        name: 'Admin Two',
        role: 'admin',
        isActive: true,
        organizationId: 1,
      })
      // 2 active admins
      prisma.user.count.mockResolvedValue(2)
      prisma.user.update.mockResolvedValue({
        id: 2,
        role: 'user',
      })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '2' },
        body: { role: 'user' },
      })

      await idHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.user.update).toHaveBeenCalled()
    })
  })
})
