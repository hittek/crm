import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

export default async function handler(req, res) {
  // Check authentication
  const session = await getSession(req, res)
  if (!session.user) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const userId = session.user.id
  const organizationId = session.user.organizationId

  if (req.method === 'GET') {
    return getNotifications(req, res, userId, organizationId)
  } else if (req.method === 'PATCH') {
    return markNotificationsRead(req, res, userId)
  } else if (req.method === 'DELETE') {
    return deleteNotifications(req, res, userId)
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
    return res.status(405).json({ error: `Method ${req.method} not allowed` })
  }
}

/**
 * GET /api/notifications
 * Query params:
 *   - limit: number of notifications to return (default 20)
 *   - offset: pagination offset
 *   - unreadOnly: if 'true', only return unread notifications
 */
async function getNotifications(req, res, userId, organizationId) {
  try {
    const { limit = '20', offset = '0', unreadOnly = 'false' } = req.query

    const where = {
      userId,
      organizationId,
      ...(unreadOnly === 'true' ? { isRead: false } : {}),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, organizationId, isRead: false },
      }),
    ])

    // Parse metadata JSON
    const parsed = notifications.map((n) => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }))

    return res.status(200).json({
      data: parsed,
      total,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return res.status(500).json({ error: 'Error fetching notifications' })
  }
}

/**
 * PATCH /api/notifications
 * Body:
 *   - ids: array of notification IDs to mark as read (optional, if not provided marks all as read)
 *   - markAllRead: if true, mark all notifications as read
 */
async function markNotificationsRead(req, res, userId) {
  try {
    const { ids, markAllRead } = req.body

    if (markAllRead) {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      return res.status(200).json({ success: true, message: 'All notifications marked as read' })
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: ids },
          userId, // Ensure user owns these notifications
        },
        data: { isRead: true, readAt: new Date() },
      })
      return res.status(200).json({ success: true, message: 'Notifications marked as read' })
    }

    return res.status(400).json({ error: 'Provide ids array or set markAllRead: true' })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return res.status(500).json({ error: 'Error updating notifications' })
  }
}

/**
 * DELETE /api/notifications
 * Body:
 *   - ids: array of notification IDs to delete (optional)
 *   - deleteAll: if true, delete all notifications
 */
async function deleteNotifications(req, res, userId) {
  try {
    const { ids, deleteAll } = req.body

    if (deleteAll) {
      await prisma.notification.deleteMany({
        where: { userId },
      })
      return res.status(200).json({ success: true, message: 'All notifications deleted' })
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      await prisma.notification.deleteMany({
        where: {
          id: { in: ids },
          userId,
        },
      })
      return res.status(200).json({ success: true, message: 'Notifications deleted' })
    }

    return res.status(400).json({ error: 'Provide ids array or set deleteAll: true' })
  } catch (error) {
    console.error('Error deleting notifications:', error)
    return res.status(500).json({ error: 'Error deleting notifications' })
  }
}
