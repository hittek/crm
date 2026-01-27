import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/reports/dashboard'
import prisma from '../../lib/prisma'

describe('/api/reports/dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return dashboard data', async () => {
      // Mock pipeline data
      prisma.deal.findMany.mockResolvedValue([])
      prisma.deal.groupBy.mockResolvedValue([
        { stage: 'lead', _count: 5, _sum: { value: 50000 } },
        { stage: 'proposal', _count: 3, _sum: { value: 75000 } },
      ])
      prisma.deal.count.mockResolvedValue(8)
      prisma.deal.aggregate.mockResolvedValue({ _sum: { value: 125000 }, _count: 5 })

      // Mock contacts data
      prisma.contact.count.mockResolvedValue(100)

      // Mock tasks data
      prisma.task.count.mockImplementation(({ where }) => {
        if (where?.status === 'completed') return Promise.resolve(10)
        if (where?.status?.not) return Promise.resolve(5) // overdue
        return Promise.resolve(15) // pending
      })

      // Mock activities data
      prisma.activity.findMany.mockResolvedValue([])
      
      // Mock audit log data
      prisma.auditLog.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      
      expect(data).toHaveProperty('pipeline')
      expect(data).toHaveProperty('contacts')
      expect(data).toHaveProperty('tasks')
      expect(data).toHaveProperty('performance')
    })

    it('should calculate pipeline totals', async () => {
      prisma.deal.findMany.mockResolvedValue([])
      prisma.deal.groupBy.mockResolvedValue([
        { stage: 'lead', _count: 2, _sum: { value: 20000 } },
      ])
      prisma.deal.count.mockResolvedValue(2)
      prisma.deal.aggregate.mockResolvedValue({ _sum: { value: 20000 }, _count: 2 })
      prisma.contact.count.mockResolvedValue(10)
      prisma.task.count.mockResolvedValue(5)
      prisma.activity.findMany.mockResolvedValue([])
      prisma.auditLog.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.pipeline.totalDeals).toBe(2)
      expect(data.pipeline.totalValue).toBe(20000)
    })

    it('should return recent activities', async () => {
      const mockActivities = [
        { id: 1, type: 'call', subject: 'Call', createdAt: new Date(), isAuditLog: false },
        { id: 2, type: 'email', subject: 'Email', createdAt: new Date(), isAuditLog: false },
      ]

      prisma.deal.findMany.mockResolvedValue([])
      prisma.deal.groupBy.mockResolvedValue([])
      prisma.deal.count.mockResolvedValue(0)
      prisma.deal.aggregate.mockResolvedValue({ _sum: { value: 0 }, _count: 0 })
      prisma.contact.count.mockResolvedValue(0)
      prisma.task.count.mockResolvedValue(0)
      prisma.activity.findMany.mockResolvedValue(mockActivities)
      prisma.auditLog.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.recentActivities.length).toBeGreaterThanOrEqual(2)
    })
    
    it('should filter data by organizationId from session', async () => {
      prisma.deal.groupBy.mockResolvedValue([])
      prisma.deal.aggregate.mockResolvedValue({ _sum: { value: 0 }, _count: 0 })
      prisma.contact.count.mockResolvedValue(0)
      prisma.task.count.mockResolvedValue(0)
      prisma.activity.findMany.mockResolvedValue([])
      prisma.auditLog.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      // Verify organizationId is used in queries
      expect(prisma.deal.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 1,
          }),
        })
      )
    })
  })
})
