/**
 * lib/deliverers/push.js
 *
 * Sends a push notification to all users in an org when a report run completes.
 * Reuses the existing sendPushToUser from lib/webpush.js.
 */

import prisma from '../prisma.js'
import { sendPushToUser } from '../webpush.js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crm.hittek.mx'

/**
 * @param {{
 *   run:        { id: number; reportId: number }
 *   definition: { name: string }
 *   org:        { id: number; name: string }
 * }} opts
 * @returns {Promise<{ sent: number; skipped: number }>}
 */
export async function deliverReportPush({ run, definition, org }) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log('[push] VAPID keys not set — skipping push delivery')
    return { sent: 0, skipped: 0, reason: 'no_vapid' }
  }

  // Fetch all org user IDs that have push subscriptions
  const users = await prisma.pushSubscription.findMany({
    where:  { user: { organizationId: org.id } },
    select: { userId: true },
    distinct: ['userId'],
  })

  if (!users.length) {
    console.log(`[push] no subscriptions for org=${org.id}`)
    return { sent: 0, skipped: 0, reason: 'no_subscriptions' }
  }

  const payload = {
    title: `📊 ${definition.name}`,
    body:  `Tu reporte está listo para ${new Date().toLocaleDateString('es-MX', { weekday: 'long', month: 'short', day: 'numeric' })}`,
    url:   `${APP_URL}/reports/${run.reportId}`,
    tag:   `report-run-${run.id}`,
    icon:  '/favicon.ico',
    badge: '/favicon.ico',
  }

  let sent = 0
  let skipped = 0

  await Promise.allSettled(
    users.map(async ({ userId }) => {
      try {
        await sendPushToUser(userId, payload)
        sent++
        console.log(`[push] sent runId=${run.id} → userId=${userId}`)
      } catch (err) {
        skipped++
        console.warn(`[push] failed runId=${run.id} → userId=${userId}: ${err.message}`)
      }
    })
  )

  return { sent, skipped }
}
