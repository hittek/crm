import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/activities/index'
import prisma from '../../lib/prisma'

describe('/api/activities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return activities with pagination', async () => {
      const mockActivities = [
        { id: 1, type: 'call', subject: 'Call with client' },
        { id: 2, type: 'email', subject: 'Follow up email' },
      ]

      prisma.activity.findMany.mockResolvedValue(mockActivities)
      prisma.activity.count.mockResolvedValue(2)

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.data).toHaveLength(2)
    })

    it('should filter activities by contactId', async () => {
      prisma.activity.findMany.mockResolvedValue([])
      prisma.activity.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { contactId: '1' },
      })

      await handler(req, res)

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactId: 1,
          }),
        })
      )
    })

    it('should order activities by createdAt desc', async () => {
      prisma.activity.findMany.mockResolvedValue([])
      prisma.activity.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: {},
      })

      await handler(req, res)

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('POST', () => {
    it('should create a new activity', async () => {
      const newActivity = {
        type: 'call',
        subject: 'New call',
        contactId: 1,
      }

      const createdActivity = { id: 1, ...newActivity }
      prisma.activity.create.mockResolvedValue(createdActivity)

      const { req, res } = createMocks({
        method: 'POST',
        body: newActivity,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.subject).toBe('New call')
    })

    it('should create follow-up task when specified', async () => {
      const newActivity = {
        type: 'call',
        subject: 'Call with client',
        contactId: 1,
        createFollowUp: true,
      }

      prisma.activity.create.mockResolvedValue({ id: 1, ...newActivity })
      prisma.task.create.mockResolvedValue({ id: 1, title: 'Follow up: Call with client' })

      const { req, res } = createMocks({
        method: 'POST',
        body: newActivity,
      })

      await handler(req, res)

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining('Follow up'),
          contactId: 1,
        }),
      })
    })
  })
})
