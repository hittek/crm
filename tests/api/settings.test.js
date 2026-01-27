import { createMocks } from 'node-mocks-http'
import handler from '../../pages/api/settings/index'
import prisma from '../../lib/prisma'
import { getSession, hasMinRole } from '../../lib/auth'

describe('/api/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return settings with organization data', async () => {
      const mockOrganization = {
        name: 'Test Company',
        logo: null,
        favicon: null,
        primaryColor: '#4F46E5',
        timezone: 'America/Mexico_City',
        currency: 'MXN',
        locale: 'es-MX',
        orgSettings: null,
      }

      prisma.organization.findUnique.mockResolvedValue(mockOrganization)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.organization.name).toBe('Test Company')
      expect(data.organization.currency).toBe('MXN')
    })

    it('should return default deal stages when no custom settings', async () => {
      const mockOrganization = {
        name: 'Test Company',
        orgSettings: null,
      }

      prisma.organization.findUnique.mockResolvedValue(mockOrganization)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      const data = JSON.parse(res._getData())
      expect(data.dealStages).toBeDefined()
      expect(data.dealStages.length).toBeGreaterThan(0)
      expect(data.dealStages.some(s => s.id === 'lead')).toBe(true)
      expect(data.dealStages.some(s => s.id === 'won')).toBe(true)
    })

    it('should return custom deal stages from orgSettings', async () => {
      const customStages = [
        { id: 'custom1', label: 'Custom Stage 1', color: 'blue', probability: 20 },
        { id: 'custom2', label: 'Custom Stage 2', color: 'green', probability: 80 },
      ]
      
      const mockOrganization = {
        name: 'Test Company',
        orgSettings: JSON.stringify({ dealStages: customStages }),
      }

      prisma.organization.findUnique.mockResolvedValue(mockOrganization)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      const data = JSON.parse(res._getData())
      expect(data.dealStages).toEqual(customStages)
    })

    it('should return default contact statuses', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        name: 'Test',
        orgSettings: null,
      })

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      const data = JSON.parse(res._getData())
      expect(data.contactStatuses).toBeDefined()
      expect(data.contactStatuses.some(s => s.id === 'active')).toBe(true)
    })

    it('should return 404 if organization not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(404)
    })
  })

  describe('PUT', () => {
    it('should update organization settings', async () => {
      const mockOrganization = {
        orgSettings: null,
      }

      prisma.organization.findUnique.mockResolvedValue(mockOrganization)
      prisma.organization.update.mockResolvedValue({
        name: 'Updated Company',
        primaryColor: '#FF0000',
        orgSettings: '{}',
      })
      
      // Mock the subsequent GET call
      prisma.organization.findUnique
        .mockResolvedValueOnce(mockOrganization) // First call for update
        .mockResolvedValueOnce({
          name: 'Updated Company',
          primaryColor: '#FF0000',
          orgSettings: null,
        }) // Second call for returning updated settings

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          organization: {
            name: 'Updated Company',
            primaryColor: '#FF0000',
          },
        },
      })

      await handler(req, res)

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: 'Updated Company',
          primaryColor: '#FF0000',
        }),
      })
    })

    it('should update custom deal stages in orgSettings', async () => {
      const newStages = [
        { id: 'new1', label: 'New Stage', color: 'purple', probability: 50 },
      ]

      prisma.organization.findUnique.mockResolvedValue({ orgSettings: null })
      prisma.organization.update.mockResolvedValue({})

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          dealStages: newStages,
        },
      })

      await handler(req, res)

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          orgSettings: expect.stringContaining('dealStages'),
        }),
      })
    })

    it('should update notification settings', async () => {
      prisma.organization.findUnique.mockResolvedValue({ orgSettings: null })
      prisma.organization.update.mockResolvedValue({})

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          notifications: {
            emailEnabled: false,
            taskReminders: true,
          },
        },
      })

      await handler(req, res)

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          orgSettings: expect.stringContaining('notifications'),
        }),
      })
    })

    it('should handle empty body gracefully', async () => {
      prisma.organization.findUnique.mockResolvedValue({ orgSettings: null })
      prisma.organization.update.mockResolvedValue({})

      const { req, res } = createMocks({
        method: 'PUT',
        body: {},
      })

      await handler(req, res)

      // Empty body is valid - updates with empty data
      expect(res._getStatusCode()).toBe(200)
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for POST', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })

    it('should return 405 for DELETE', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
