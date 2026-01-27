import { createMocks } from 'node-mocks-http'
import meHandler from '../../pages/api/auth/me'
import logoutHandler from '../../pages/api/auth/logout'
import prisma from '../../lib/prisma'
import { getSession } from '../../lib/auth'

// Note: login.js requires bcrypt password verification which is complex to mock
// Those flows are covered by E2E tests

describe('/api/auth/me', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return current user data when authenticated', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        avatar: null,
        role: 'admin',
        isActive: true,
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        organizationId: 1,
        organization: {
          id: 1,
          name: 'Test Org',
          slug: 'test-org',
          isActive: true,
        },
      }

      prisma.user.findUnique.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await meHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.user).toBeDefined()
      expect(data.user.email).toBe('admin@example.com')
    })

    it('should return user organization info', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        isActive: true,
        organizationId: 1,
        organization: {
          id: 1,
          name: 'Test Organization',
          slug: 'test-org',
          isActive: true,
        },
      }

      prisma.user.findUnique.mockResolvedValue(mockUser)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await meHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      // The API returns organizationName as a flat field, not nested
      expect(data.user.organizationId).toBe(1)
      expect(data.user.organizationName).toBe('Test Organization')
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for POST', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await meHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})

describe('/api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should return success on logout', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await logoutHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.success).toBe(true)
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for GET', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      })

      await logoutHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
