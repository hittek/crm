import prisma from '../../../lib/prisma'
import { getSession, verifyPassword } from '../../../lib/auth'
import { logAudit, AuditActions, AuditEntities } from '../../../lib/audit'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' })
  }

  try {
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        avatar: true,
        role: true,
        isActive: true,
        timezone: true,
        locale: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Tu cuenta está desactivada. Contacta al administrador.' })
    }

    if (!user.organization?.isActive) {
      return res.status(401).json({ error: 'Tu organización está desactivada. Contacta al administrador.' })
    }

    if (!user.password) {
      return res.status(401).json({ error: 'Tu cuenta no tiene contraseña configurada. Contacta al administrador.' })
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Create session (exclude avatar to avoid cookie size limit)
    const session = await getSession(req, res)
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      timezone: user.timezone,
      locale: user.locale,
      organizationId: user.organizationId,
      organizationName: user.organization?.name,
    }
    await session.save()

    // Log the login
    await logAudit({
      action: AuditActions.LOGIN || 'login',
      entity: AuditEntities.USER,
      entityId: user.id,
      entityName: user.name,
      userId: user.id,
      userName: user.name,
      organizationId: user.organizationId,
      req,
    })

    // Return user data (without password)
    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        timezone: user.timezone,
        locale: user.locale,
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}
