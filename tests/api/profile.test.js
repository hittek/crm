import { createMocks } from 'node-mocks-http'
import profileHandler from '../../pages/api/auth/profile'
import prisma from '../../lib/prisma'
import { getSession, hashPassword } from '../../lib/auth'

// Mock bcryptjs for password verification
jest.mock('bcryptjs', () => ({
  compare: jest.fn((password, hash) => Promise.resolve(password === 'correct-password')),
}))

describe('/api/auth/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return current user profile', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(mockProfile)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.email).toBe('test@example.com')
      expect(data.name).toBe('Test User')
      expect(data.timezone).toBe('America/Mexico_City')
      expect(data.locale).toBe('es-MX')
    })

    it('should return 404 if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Usuario no encontrado')
    })

    it('should include avatar in response', async () => {
      const mockProfile = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'data:image/png;base64,abc123',
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(mockProfile)

      const { req, res } = createMocks({
        method: 'GET',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.avatar).toBe('data:image/png;base64,abc123')
    })
  })

  describe('PUT', () => {
    it('should update user name', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Old Name',
        password: 'hashedPassword',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'New Name',
        avatar: null,
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          name: 'New Name',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.name).toBe('New Name')
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'New Name' }),
        })
      )
    })

    it('should update timezone and locale', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        role: 'admin',
        timezone: 'America/New_York',
        locale: 'en-US',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          timezone: 'America/New_York',
          locale: 'en-US',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.timezone).toBe('America/New_York')
      expect(data.locale).toBe('en-US')
    })

    it('should update avatar', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: 'data:image/png;base64,newAvatar123',
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          avatar: 'data:image/png;base64,newAvatar123',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.avatar).toBe('data:image/png;base64,newAvatar123')
    })

    it('should remove avatar when set to empty string', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        avatar: 'data:image/png;base64,oldAvatar',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: '',
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          avatar: '',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ avatar: '' }),
        })
      )
    })

    it('should require current password when changing password', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          newPassword: 'newSecurePassword123',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Debes proporcionar tu contraseña actual')
    })

    it('should reject password change with incorrect current password', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          currentPassword: 'wrong-password',
          newPassword: 'newSecurePassword123',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('La contraseña actual es incorrecta')
    })

    it('should change password with correct current password', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          currentPassword: 'correct-password',
          newPassword: 'newSecurePassword123',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ 
            password: 'hashed_newSecurePassword123',
          }),
        })
      )
    })

    it('should reject password shorter than 6 characters', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          currentPassword: 'correct-password',
          newPassword: '12345',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(400)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('La nueva contraseña debe tener al menos 6 caracteres')
    })

    it('should return 404 if user not found during update', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          name: 'New Name',
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(404)
      const data = JSON.parse(res._getData())
      expect(data.error).toBe('Usuario no encontrado')
    })

    it('should update preferences as JSON', async () => {
      const existingUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
      }

      const updatedUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        avatar: null,
        role: 'admin',
        timezone: 'America/Mexico_City',
        locale: 'es-MX',
        preferences: '{"theme":"dark","notifications":true}',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      prisma.user.findUnique.mockResolvedValue(existingUser)
      prisma.user.update.mockResolvedValue(updatedUser)

      const { req, res } = createMocks({
        method: 'PUT',
        body: {
          preferences: { theme: 'dark', notifications: true },
        },
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(200)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ 
            preferences: JSON.stringify({ theme: 'dark', notifications: true }),
          }),
        })
      )
    })
  })

  describe('unsupported methods', () => {
    it('should return 405 for DELETE', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })

    it('should return 405 for POST', async () => {
      const { req, res } = createMocks({
        method: 'POST',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })

    it('should return 405 for PATCH', async () => {
      const { req, res } = createMocks({
        method: 'PATCH',
      })

      await profileHandler(req, res)

      expect(res._getStatusCode()).toBe(405)
    })
  })
})
