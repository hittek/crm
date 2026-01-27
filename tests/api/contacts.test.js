import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/contacts/index'
import prisma from '../../lib/prisma'

describe('/api/contacts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return contacts with pagination', async () => {
      const mockContacts = [
        { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ]

      prisma.contact.findMany.mockResolvedValue(mockContacts)
      prisma.contact.count.mockResolvedValue(2)

      const { req, res } = createMocks({
        method: 'GET',
        query: { page: '1', limit: '10' },
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.contacts).toHaveLength(2)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.total).toBe(2)
    })

    it('should filter contacts by search query', async () => {
      prisma.contact.findMany.mockResolvedValue([])
      prisma.contact.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { search: 'john' },
      })

      await handler(req, res)

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ firstName: { contains: 'john' } }),
            ]),
          }),
        })
      )
    })

    it('should filter contacts by status', async () => {
      prisma.contact.findMany.mockResolvedValue([])
      prisma.contact.count.mockResolvedValue(0)

      const { req, res } = createMocks({
        method: 'GET',
        query: { status: 'active' },
      })

      await handler(req, res)

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
          }),
        })
      )
    })
  })

  describe('POST', () => {
    it('should create a new contact', async () => {
      const newContact = {
        firstName: 'New',
        lastName: 'Contact',
        email: 'new@example.com',
      }

      const createdContact = { id: 1, ...newContact }
      prisma.contact.create.mockResolvedValue(createdContact)

      const { req, res } = createMocks({
        method: 'POST',
        body: newContact,
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(201)
      const data = JSON.parse(res._getData())
      expect(data.firstName).toBe('New')
      expect(data.lastName).toBe('Contact')
    })

    it('should include createdBy and updatedBy fields', async () => {
      const newContact = { firstName: 'Test', lastName: 'User' }
      prisma.contact.create.mockResolvedValue({ id: 1, ...newContact })

      const { req, res } = createMocks({
        method: 'POST',
        body: newContact,
      })

      await handler(req, res)

      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: 'system',
          updatedBy: 'system',
          organizationId: 1,
          visibility: 'org',
        }),
        include: expect.any(Object),
      })
    })

    it('should set organizationId from session', async () => {
      const newContact = { firstName: 'Test', lastName: 'User' }
      prisma.contact.create.mockResolvedValue({ id: 1, ...newContact, organizationId: 1 })

      const { req, res } = createMocks({
        method: 'POST',
        body: newContact,
      })

      await handler(req, res)

      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 1,
          }),
        })
      )
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
