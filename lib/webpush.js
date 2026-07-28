/**
 * lib/webpush.js
 * Thin wrapper around web-push that sends to all subscriptions for a user.
 * Auto-cleans expired / invalid subscriptions (410 Gone).
 */
import webpush from 'web-push'
import prisma from './prisma'

let initialized = false

function init() {
  if (initialized) return
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID keys not set — push notifications disabled')
    return
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@hittek.mx',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  initialized = true
}

/**
 * Send a push notification to all subscriptions for a user.
 * @param {number} userId
 * @param {{ title: string, body?: string, icon?: string, badge?: string, url?: string, tag?: string }} payload
 */
export async function sendPushToUser(userId, payload) {
  init()
  if (!initialized) return

  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (!subs.length) return

  const data = JSON.stringify(payload)
  const expired = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
          { TTL: 60 * 60 * 24 } // 24h TTL
        )
        // Update lastUsed
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsed: new Date() },
        }).catch(() => {})
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or unsubscribed
          expired.push(sub.id)
        } else {
          console.error(`[webpush] send failed for sub ${sub.id}:`, err.message)
        }
      }
    })
  )

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } })
      .catch(() => {})
  }
}

export default { sendPushToUser }
