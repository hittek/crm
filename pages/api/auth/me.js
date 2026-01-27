import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  try {
    const session = await getSession(req, res)
    
    if (!session.user) {
      return res.status(401).json({ user: null })
    }

    // Get fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
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

    if (!user || !user.isActive) {
      // User was deleted or deactivated, destroy session
      session.destroy()
      return res.status(401).json({ user: null })
    }

    if (!user.organization?.isActive) {
      // Organization was deactivated, destroy session
      session.destroy()
      return res.status(401).json({ user: null })
    }

    // Update session with fresh data (excluding avatar to avoid cookie size limit)
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

    // Return full user data including avatar (avatar is fetched from DB, not stored in session)
    res.status(200).json({ 
      user: {
        ...session.user,
        avatar: user.avatar,
      }
    })
  } catch (error) {
    console.error('Me error:', error)
    res.status(500).json({ error: 'Error al obtener usuario' })
  }
}
