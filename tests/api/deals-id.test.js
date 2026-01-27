import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/deals/[id]'
import prisma from '../../lib/prisma'

describe('/api/deals/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return a deal by id', async () => {
      const mockDeal = {
        id: 1,
        title: 'Test Deal',
        value: 50000,
        stage: 'proposal',
        organizationId: 1,
        contact: { id: 1, firstName: 'John' },
        ownerUser: null,
        tasks: [],
        activities: [],
      }

      prisma.deal.findFirst.mockResolvedValue(mockDeal)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('Test Deal')
      expect(data.value).toBe(50000)
    })

    it('should filter by organizationId from session', async () => {
      prisma.deal.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(prisma.deal.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            organizationId: 1,
          }),
        })
      )
    })

    it('should return 404 for non-existent deal', async () => {
      prisma.deal.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '999' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('PUT', () => {
    it('should update a deal', async () => {
      const existingDeal = { id: 1, stage: 'lead', organizationId: 1 }
      const updatedDeal = {
        id: 1,
        title: 'Updated Deal',
        stage: 'proposal',
        contact: null,
        ownerUser: null,
      }

      prisma.deal.findFirst.mockResolvedValue(existingDeal)
      prisma.deal.update.mockResolvedValue(updatedDeal)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { title: 'Updated Deal', stage: 'proposal' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('Updated Deal')
    })

    it('should return 404 if deal does not exist', async () => {
      prisma.deal.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { stage: 'proposal' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })

    it('should create activity when stage changes', async () => {
      const existingDeal = { id: 1, stage: 'lead', contactId: 1, organizationId: 1 }
      const updatedDeal = {
        id: 1,
        stage: 'proposal',
        contactId: 1,
        contact: { id: 1, firstName: 'John', lastName: 'Doe', company: 'Test' },
        ownerUser: null,
      }

      prisma.deal.findFirst.mockResolvedValue(existingDeal)
      prisma.deal.update.mockResolvedValue(updatedDeal)
      prisma.activity.create.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { stage: 'proposal' },
      })

      await handler(req, res)

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'deal_updated',
          subject: expect.stringContaining('proposal'),
          organizationId: 1,
        }),
      })
    })

    it('should set actualClose when stage is won', async () => {
      const existingDeal = { id: 1, stage: 'negotiation', organizationId: 1 }
      prisma.deal.findFirst.mockResolvedValue(existingDeal)
      prisma.deal.update.mockResolvedValue({ id: 1, stage: 'won' })
      prisma.activity.create.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { stage: 'won' },
      })

      await handler(req, res)

      expect(prisma.deal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          actualClose: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })
  })

  describe('DELETE', () => {
    it('should delete a deal', async () => {
      const existingDeal = {
        id: 1,
        title: 'Test Deal',
        organizationId: 1,
        ownerId: 1, // Matches mock user id
      }
      prisma.deal.findFirst.mockResolvedValue(existingDeal)
      prisma.deal.delete.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(204)
      expect(prisma.deal.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should return 404 if deal does not exist', async () => {
      prisma.deal.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })
})
