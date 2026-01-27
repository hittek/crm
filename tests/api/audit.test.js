import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/audit/index'
import prisma from '../../lib/prisma'

describe('/api/audit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return audit logs with pagination', async () => {
      const mockLogs = [
        { 
          id: 1, 
          action: 'created', 
          entity: 'contact', 
          entityId: 1, 
          entityName: 'John Doe',
          userId: 1,
          userName: 'Admin',
          details: '{"email":"john@example.com"}',
          createdAt: new Date(),
          user: { id: 1, name: 'Admin', avatar: null, email: 'admin@example.com' }
        },
        { 
          id: 2, 
          action: 'updated', 
          entity: 'deal', 
          entityId: 2, 
          entityName: 'Big Deal',
          userId: 1,
          userName: 'Admin',
          details: null,
          createdAt: new Date(),
          user: { id: 1, name: 'Admin', avatar: null, email: 'admin@example.com' }
        },
      ]

      prisma.auditLog.findMany.mockResolvedValue(mockLogs)
      prisma.auditLog.count.mockResolvedValue(2)

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
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        })
      )
    })

    it('should filter by entity type', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { entity: 'contact' },
      })

      await handler(req, res)

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity: 'contact',
          }),
        })
      )
    })

    it('should filter by action', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { action: 'created' },
      })

      await handler(req, res)

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'created',
          }),
        })
      )
    })

    it('should filter by date range', async () => {
      prisma.auditLog.findMany.mockResolvedValue([])
      prisma.auditLog.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { 
          startDate: '2026-01-01',
          endDate: '2026-01-31'
        },
      })

      await handler(req, res)

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      )
    })

    it('should parse JSON details in audit logs', async () => {
      const mockLogs = [
        { 
          id: 1, 
          action: 'created', 
          entity: 'contact', 
          details: '{"email":"test@example.com","phone":"+1234567890"}',
          createdAt: new Date(),
        },
      ]

      prisma.auditLog.findMany.mockResolvedValue(mockLogs)
      prisma.auditLog.count.mockResolvedValue(1)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      const data = JSON.parse(res._getData())
      expect(data.data[0].details).toEqual({
        email: 'test@example.com',
        phone: '+1234567890',
      })
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for POST', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
