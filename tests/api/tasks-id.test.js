import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/tasks/[id]'
import prisma from '../../lib/prisma'

describe('/api/tasks/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return a task by id', async () => {
      const mockTask = {
        id: 1,
        title: 'Test Task',
        status: 'pending',
        priority: 'high',
        organizationId: 1,
        contact: { id: 1, firstName: 'John' },
        deal: null,
        assignedTo: null,
        ownerUser: null,
      }

      prisma.task.findFirst.mockResolvedValue(mockTask)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('Test Task')
    })

    it('should filter by organizationId from session', async () => {
      prisma.task.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(prisma.task.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            organizationId: 1,
          }),
        })
      )
    })

    it('should return 404 for non-existent task', async () => {
      prisma.task.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '999' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('PUT', () => {
    it('should update a task', async () => {
      const existingTask = {
        id: 1,
        title: 'Test Task',
        status: 'pending',
        organizationId: 1,
        assignedTo: null,
      }
      const updatedTask = {
        id: 1,
        title: 'Updated Task',
        status: 'in-progress',
        contact: null,
        deal: null,
        assignedTo: null,
      }

      prisma.task.findFirst.mockResolvedValue(existingTask)
      prisma.task.update.mockResolvedValue(updatedTask)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { title: 'Updated Task', status: 'in-progress' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.title).toBe('Updated Task')
    })

    it('should return 404 if task does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { status: 'completed' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })

    it('should set completedAt when status changes to completed', async () => {
      const existingTask = {
        id: 1,
        title: 'Test Task',
        status: 'pending',
        organizationId: 1,
        assignedTo: null,
      }
      prisma.task.findFirst.mockResolvedValue(existingTask)
      prisma.task.update.mockResolvedValue({ id: 1, status: 'completed', title: 'Test Task' })
      prisma.activity.create.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { status: 'completed' },
      })

      await handler(req, res)

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          completedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      })
    })

    it('should create activity when task is completed', async () => {
      const existingTask = {
        id: 1,
        title: 'Completed Task',
        status: 'pending',
        organizationId: 1,
        assignedTo: null,
      }
      const completedTask = {
        id: 1,
        title: 'Completed Task',
        status: 'completed',
        contactId: 1,
        dealId: 2,
      }

      prisma.task.findFirst.mockResolvedValue(existingTask)
      prisma.task.update.mockResolvedValue(completedTask)
      prisma.activity.create.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { status: 'completed' },
      })

      await handler(req, res)

      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'task_completed',
          subject: expect.stringContaining('Completed Task'),
          organizationId: 1,
        }),
      })
    })
  })

  describe('DELETE', () => {
    it('should delete a task', async () => {
      const existingTask = {
        id: 1,
        title: 'Test Task',
        organizationId: 1,
        ownerId: 1, // Matches mock user id
      }
      prisma.task.findFirst.mockResolvedValue(existingTask)
      prisma.task.delete.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(204)
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should return 404 if task does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })
})
