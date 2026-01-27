import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/deals/index'
import prisma from '../../lib/prisma'

describe('/api/deals', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return deals with pagination', async () => {
      const mockDeals = [
        { id: 1, title: 'Deal 1', value: 10000, stage: 'lead' },
        { id: 2, title: 'Deal 2', value: 20000, stage: 'qualified' },
      ]

      prisma.deal.findMany.mockResolvedValue(mockDeals)
      prisma.deal.count.mockResolvedValue(2)

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

    it('should filter deals by stage', async () => {
      prisma.deal.findMany.mockResolvedValue([])
      prisma.deal.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { stage: 'proposal' },
      })

      await handler(req, res)

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: 'proposal',
          }),
        })
      )
    })

    it('should filter deals by contactId', async () => {
      prisma.deal.findMany.mockResolvedValue([])
      prisma.deal.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { contactId: '5' },
      })

      await handler(req, res)

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: 5,
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should create a new deal with default values', async () => {
      const newDeal = {
        title: 'New Deal',
        contactId: 1,
        value: 50000,
      }

      const createdDeal = { id: 1, ...newDeal, stage: 'lead', probability: 10 }
      prisma.deal.create.mockResolvedValue(createdDeal)

      const { req, res } = createMocks({
        method: 'POST',
        body: newDeal,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('New Deal')
    })

    it('should set default expectedClose to 30 days from now', async () => {
      const newDeal = { title: 'Test Deal' }
      prisma.deal.create.mockResolvedValue({ id: 1, ...newDeal })

      const { req, res } = createMocks({
        method: 'POST',
        body: newDeal,
      })

      await handler(req, res)

      expect(prisma.deal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expectedClose: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })
  })
})
