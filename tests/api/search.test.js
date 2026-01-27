import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/search/index'
import prisma from '../../lib/prisma'

describe('/api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return empty results for short queries', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'a' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.contacts).toEqual([])
      expect(data.deals).toEqual([])
      expect(data.tasks).toEqual([])
    })

    it('should search contacts, deals, and tasks', async () => {
      const mockContacts = [{ id: 1, firstName: 'John', lastName: 'Doe' }]
      const mockDeals = [{ id: 1, title: 'John Deal' }]
      const mockTasks = [{ id: 1, title: 'Call John' }]

      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.deal.findMany.mockResolvedValue(mockDeals)
      prisma.task.findMany.mockResolvedValue(mockTasks)

      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'john' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.contacts).toHaveLength(1)
      expect(data.deals).toHaveLength(1)
      expect(data.tasks).toHaveLength(1)
    })

    it('should search contacts with appropriate fields', async () => {
      prisma.contact.findMany.mockResolvedValue([])
      prisma.deal.findMany.mockResolvedValue([])
      prisma.task.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'test' },
      })

      await handler(req, res)

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'test' } },
              { lastName: { contains: 'test' } },
              { email: { contains: 'test' } },
            ]),
          }),
          take: 5,
        })
      )
    })

    it('should limit results to 5 per entity', async () => {
      prisma.contact.findMany.mockResolvedValue([])
      prisma.deal.findMany.mockResolvedValue([])
      prisma.task.findMany.mockResolvedValue([])

      const { req, res } = createMocks({
        method: 'GET',
        query: { q: 'search' },
      })

      await handler(req, res)

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
    })
  })
})
