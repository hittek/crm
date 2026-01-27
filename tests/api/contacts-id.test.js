import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/contacts/[id]'
import prisma from '../../lib/prisma'

describe('/api/contacts/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return a contact by id', async () => {
      const mockContact = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationId: 1,
        deals: [],
        tasks: [],
        activities: [],
        owner: null,
        _count: { deals: 0, tasks: 0, activities: 0 },
      }

      prisma.contact.findFirst.mockResolvedValue(mockContact)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.firstName).toBe('John')
      expect(data.lastName).toBe('Doe')
    })

    it('should filter by organizationId from session', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(prisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 1,
            organizationId: 1,
          }),
        })
      )
    })

    it('should return 404 for non-existent contact', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
        query: { id: '999' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('PUT', () => {
    it('should update a contact', async () => {
      const existingContact = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        organizationId: 1,
      }
      const updatedContact = {
        id: 1,
        firstName: 'John',
        lastName: 'Updated',
        email: 'john@example.com',
      }

      // First call checks existence, second for validation
      prisma.contact.findFirst.mockResolvedValue(existingContact)
      prisma.contact.update.mockResolvedValue(updatedContact)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { lastName: 'Updated' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.lastName).toBe('Updated')
    })

    it('should return 404 if contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { firstName: 'Test' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })

    it('should set updatedBy on update', async () => {
      const existingContact = { id: 1, organizationId: 1 }
      prisma.contact.findFirst.mockResolvedValue(existingContact)
      prisma.contact.update.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'PUT',
        query: { id: '1' },
        body: { firstName: 'Test' },
      })

      await handler(req, res)

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          updatedBy: 'system',
        }),
      })
    })
  })

  describe('DELETE', () => {
    it('should delete a contact', async () => {
      // Mock the contact existence check (uses findFirst with organizationId)
      const existingContact = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        organizationId: 1,
        ownerId: 1, // Matches mock user id
      }
      prisma.contact.findFirst.mockResolvedValue(existingContact)
      prisma.contact.delete.mockResolvedValue({ id: 1 })

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(204)
      expect(prisma.contact.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      })
    })

    it('should return 404 if contact does not exist', async () => {
      prisma.contact.findFirst.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'DELETE',
        query: { id: '1' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })
})
