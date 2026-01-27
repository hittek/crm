import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/tasks/index'
import prisma from '../../lib/prisma'

describe('/api/tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return tasks with pagination', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'pending', priority: 'high' },
        { id: 2, title: 'Task 2', status: 'pending', priority: 'medium' },
      ]

      prisma.task.findMany.mockResolvedValue(mockTasks)
      prisma.task.count.mockResolvedValue(2)

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.data).toHaveLength(2)
    })

    it('should filter tasks by status', async () => {
      prisma.task.findMany.mockResolvedValue([])
      prisma.task.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'completed' },
      })

      await handler(req, res)

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'completed',
          }),
        })
      )
    })

    it('should filter tasks by priority', async () => {
      prisma.task.findMany.mockResolvedValue([])
      prisma.task.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { priority: 'high' },
      })

      await handler(req, res)

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'high',
          }),
        })
      )
    })

    it('should filter tasks due today', async () => {
      prisma.task.findMany.mockResolvedValue([])
      prisma.task.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { filter: 'today' },
      })

      await handler(req, res)

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should filter overdue tasks', async () => {
      prisma.task.findMany.mockResolvedValue([])
      prisma.task.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { filter: 'overdue' },
      })

      await handler(req, res)

      expect(prisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              lt: expect.any(Date),
            }),
            status: { not: 'completed' },
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should create a new task', async () => {
      const newTask = {
        title: 'New Task',
        priority: 'high',
        dueDate: '2026-01-15',
      }

      const createdTask = { id: 1, ...newTask, status: 'pending' }
      prisma.task.create.mockResolvedValue(createdTask)

      const { req, res } = createMocks({
        method: 'POST',
        body: newTask,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('New Task')
    })

    it('should link task to contact and deal', async () => {
      const newTask = {
        title: 'Linked Task',
        contactId: 1,
        dealId: 2,
      }

      prisma.task.create.mockResolvedValue({ id: 1, ...newTask })

      const { req, res } = createMocks({
        method: 'POST',
        body: newTask,
      })

      await handler(req, res)

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contactId: 1,
          dealId: 2,
        }),
        include: expect.any(Object),
      })
    })
  })
})
