/**
 * pages/api/notifications/subscribe.js
 * POST  — save a PushSubscription for the logged-in user
 * DELETE — remove a PushSubscription by endpoint
 */
import prisma from '../../../lib/prisma'
import { getSession } from '../../../lib/auth'

export default async function handler(req, res) {
  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).json({ error: 'No autenticado' })

  const userId = session.user.id

  if (req.method === 'POST') {
    const { endpoint, keys } = req.body
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Suscripción inválida' })
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { userId, p256dh: keys.p256dh, auth: keys.auth, lastUsed: new Date() },
    })

    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const { endpoint } = req.body
    if (!endpoint) return res.status(400).json({ error: 'Se requiere endpoint' })

    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } }).catch(() => {})
    return res.status(200).json({ ok: true })
  }

  res.setHeader('Allow', ['POST', 'DELETE'])
  return res.status(405).end()
}
