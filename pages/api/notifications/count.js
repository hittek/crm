import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

/**
 * GET /api/notifications/count
 * Returns only the unread count — no notification rows fetched.
 * Used by the bell icon poll to minimize DB work and Vercel invocations.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }

  const session = await getSession(req, res)
  if (!session.user) return res.status(401).json({ error: 'No autenticado' })

  const { id: userId, organizationId } = session.user

  try {
    const unreadCount = await prisma.notification.count({
      where: { userId, organizationId, isRead: false },
    })

    // Cache for 30s — CDN/edge won't cache (auth required), but browser
    // can avoid duplicate requests in the same render cycle.
    res.setHeader('Cache-Control', 'private, max-age=30')
    return res.status(200).json({ unreadCount })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return res.status(500).json({ error: 'Error fetching count' })
  }
}
