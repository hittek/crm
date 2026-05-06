/**
 * GET /api/notifications/stream
 *
 * Server-Sent Events endpoint for real-time notification delivery.
 * One persistent connection per browser tab. The server polls the DB
 * every 3 seconds — far cheaper than having every tab poll independently,
 * and near-real-time for escalation alerts.
 *
 * Vercel compatibility:
 *   - maxDuration = 55s (just under the 60s default function timeout)
 *   - Client must reconnect on close (EventSource does this automatically)
 *
 * Events emitted:
 *   event: notification   data: { ...notificationObject }
 *   event: ping           data: timestamp   (keepalive every 15s)
 */

import { getSession } from '../../../lib/auth'
import prisma from '../../../lib/prisma'

export const config = { maxDuration: 55 }

const POLL_MS     = 3000   // internal DB poll interval
const KEEPALIVE_MS = 15000  // SSE keepalive ping

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const session = await getSession(req, res)
  if (!session?.user) return res.status(401).end()

  const { id: userId, organizationId } = session.user

  // Set SSE headers
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')  // disable nginx buffering
  res.flushHeaders()

  function send(event, data) {
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      if (res.flush) res.flush()
    } catch (_) {}
  }

  // Track last seen notification ID to send only new ones
  let lastId = 0
  try {
    const latest = await prisma.notification.findFirst({
      where:   { userId, organizationId },
      orderBy: { id: 'desc' },
      select:  { id: true },
    })
    if (latest) lastId = latest.id
  } catch (_) {}

  send('ping', Date.now())

  let closed = false
  req.on('close', () => { closed = true })

  // Poll DB and push new notifications
  async function poll() {
    if (closed) return
    try {
      const newNotifs = await prisma.notification.findMany({
        where:   { userId, organizationId, id: { gt: lastId } },
        orderBy: { id: 'asc' },
      })
      for (const notif of newNotifs) {
        if (closed) return
        send('notification', notif)
        lastId = notif.id
      }
    } catch (err) {
      console.error('[notifications/stream] poll error:', err.message)
    }
  }

  const pollTimer     = setInterval(poll, POLL_MS)
  const keepaliveTimer = setInterval(() => { if (!closed) send('ping', Date.now()) }, KEEPALIVE_MS)

  // Clean up when connection drops or function times out
  req.on('close', () => {
    clearInterval(pollTimer)
    clearInterval(keepaliveTimer)
    if (!res.writableEnded) res.end()
  })
}
