import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/notifications/index'
import prisma from '../../lib/prisma'

// Mock prisma
jest.mock('../../lib/prisma', () => ({
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
}))

// Mock auth
jest.mock('../../lib/auth', () => ({
  getSession: jest.fn(() => ({
    user: { id: 1, name: 'Test User', email: 'test@example.com', organizationId: 1 },
  })),
}))

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return notifications with unread count', async () => {
      const mockNotifications = [
        {
          id: 1,
          type: 'new_contact',
          title: 'Nuevo contacto agregado',
          message: 'John Doe',
          link: '/?contact=1',
          isRead: false,
          metadata: '{"entityType":"contact","entityId":1}',
          createdAt: new Date(),
        },
        {
          id: 2,
          type: 'deal_won',
          title: '¡Negocio ganado!',
          message: 'Gran venta',
          link: '/deals?deal=1',
          isRead: true,
          metadata: null,
          createdAt: new Date(),
        },
      ]

      prisma.notification.findMany.mockResolvedValue(mockNotifications)
      prisma.notification.count
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(1) // unread

      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: '10' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.data).toHaveLength(2)
      expect(data.total).toBe(2)
      expect(data.unreadCount).toBe(1)
      // Check metadata is parsed
      expect(data.data[0].metadata).toEqual({ entityType: 'contact', entityId: 1 })
    })

    it('should filter unread only when requested', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      prisma.notification.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { unreadOnly: 'true' },
      })

      await handler(req, res)

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isRead: false,
          }),
        })
      )
    })

    it('should paginate results', async () => {
      prisma.notification.findMany.mockResolvedValue([])
      prisma.notification.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { limit: '5', offset: '10' },
      })

      await handler(req, res)

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      )
    })
  })

  describe('PATCH', () => {
    it('should mark specific notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 2 })

      const { req, res } = createMocks({
        method: 'PATCH',
        body: { ids: [1, 2] },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: [1, 2] },
            userId: 1,
          },
          data: expect.objectContaining({
            isRead: true,
          }),
        })
      )
    })

    it('should mark all notifications as read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 })

      const { req, res } = createMocks({
        method: 'PATCH',
        body: { markAllRead: true },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 1,
            isRead: false,
          },
        })
      )
    })

    it('should return error when no ids or markAllRead provided', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
        body: {},
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('DELETE', () => {
    it('should delete specific notifications', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 2 })

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { ids: [1, 2] },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: [1, 2] },
            userId: 1,
          },
        })
      )
    })

    it('should delete all notifications', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 10 })

      const { req, res } = createMocks({
        method: 'DELETE',
        body: { deleteAll: true },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1 },
        })
      )
    })

    it('should return error when no ids or deleteAll provided', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        body: {},
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(400)
    })
  })

  describe('Method not allowed', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
